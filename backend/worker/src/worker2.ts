import { redisClient, redisQueueClient } from "../config/redis";
import { exec } from 'child_process';
import type { ExecException } from 'child_process';
import fs from 'fs';
import path from 'path';

interface Result {
    time: number | null;
    memory: number;
    output: string;
}

export async function worker() {
    try {
        while (true) {
            const submission = await redisQueueClient.brPop("submissions", 0);
            const userSubmission = JSON.parse(submission!.element);

            let result: Result = { time: 0, memory: 0, output: "" };
            let status = "ACCEPTED";
            let time = 0;
            let memory = 0;
            let lastExInput: string | undefined;

            try {
                for (let testCase of userSubmission.testCases) {
                    const { input, output: expectedOutput } = testCase;
                    console.log(userSubmission.code);
                    
                    console.log(input);
                    console.log(expectedOutput);
                    result = await runCode(userSubmission.code, userSubmission.language, input);
                    console.log(result)
                    time = Math.max(time, result.time!);
                    memory = Math.max(memory, result.memory);

                    const cleanedOutput = result.output.trim();
                    const cleanedExpected = expectedOutput.trim();
                    console.log(cleanedExpected)
                    console.log(cleanedOutput)

                    if (
                        cleanedOutput.includes('error') ||
                        cleanedOutput.includes('Error')
                    ) {
                        if (
                            userSubmission.language === 'cpp' &&
                            isCompileError(cleanedOutput, userSubmission.language)
                        ) {
                            status = 'COMPILE TIME ERROR';
                        } else {
                            status = 'RUNTIME ERROR';
                        }
                        lastExInput = input;
                        break;
                    } else if (cleanedOutput !== cleanedExpected) {
                        status = 'WRONG ANSWER';
                        lastExInput = input;
                        break;
                    }
                }
            } catch (err) {
                status = "RUNTIME ERROR";
                result = {
                    time: 0,
                    memory: 0,
                    output: (err as Error).message || "Unknown error"
                };
            }

            const resultObj = {
                status,
                userId: userSubmission.userId,
                questionId: userSubmission.questionId,
                result: { output: result.output, input: lastExInput },
                time,
                memory,
                difficulty: userSubmission.difficulty,
                userCode: userSubmission.userCode
            };

            await redisClient.publish("submissions", JSON.stringify(resultObj));
        }
    } catch (error) {
        console.error("Worker crashed:", error);
    }
}

const runCode = async (
    code: string,
    language: string,
    input: string
): Promise<Result> => {
    const execDir = path.join(__dirname, 'exec');

    if (!fs.existsSync(execDir)) {
        fs.mkdirSync(execDir, { recursive: true });
    }

    const fileMap: { [key: string]: string } = {
        cpp: 'main.cpp',
        python: 'script.py',
        javascript: 'script.js'
    };

    const fileName = fileMap[language];
    if (!fileName) throw new Error('Unsupported language');

    const filePath = path.join(execDir, fileName);
    fs.writeFileSync(filePath, code);
    console.log(input)
    // Before running, create the input.txt
    fs.writeFileSync(path.join(execDir, 'input.txt'), input.endsWith('\n') ? input : input + '\n');

    // Then:
    const isWindows = process.platform === 'win32';

    const commandMap: { [key: string]: string } = {
    cpp: isWindows
        ? `g++ main.cpp -o main.exe && main.exe < input.txt`
        : `g++ main.cpp -o main && ./main < input.txt`,
    python: `python3 script.py < input.txt`,
    javascript: `node script.js < input.txt`
    };
    const execCmd = commandMap[language];
    const start = Date.now();
    const memory = process.memoryUsage();

    console.log(execCmd)
    console.log(input)

    return new Promise((resolve, reject) => {
        exec(execCmd, { cwd: execDir }, (error: ExecException | null, stdout: string, stderr: string) => {
            const executionTime = Date.now() - start;
            const memoryUsed = process.memoryUsage().heapUsed - memory.heapUsed;
            console.log(stderr)
            
            if (error) {
                reject({
                    time: executionTime / 1000,
                    memory: memoryUsed / (1024 * 1024),
                    output: stderr
                });
            } else {
                resolve({
                    time: executionTime / 1000,
                    memory: memoryUsed / (1024 * 1024),
                    output: stdout
                });
            }
        });
    });
};

const isCompileError = (errorOutput: string, language: string) => {
    const patterns: { [key: string]: RegExp } = {
        cpp: /error:|undefined reference to/
    };
    return patterns[language]?.test(errorOutput) ?? false;
};

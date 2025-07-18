import {Request, Response} from 'express';
import { redisClient , isRedisConnected, redisQueueClient } from '../config/redisClient';
import {z} from 'zod';
import prisma from '../config/prismaClient';

//exec run code with two test cases and return the result

export const submitProblem = async(req:Request, res: Response)=>{
    try{

        if(!isRedisConnected()){
            return res.status(500).json({error: "Redis not connected" , message: "Something went wrong  , Please try again later"});
        }
        const submitProblemSchema = z.object({
            questionId: z.string(),
            code: z.string(),
            language: z.string(),
            userCode: z.string(),
        });

        const zodValidation = submitProblemSchema.safeParse(req.body);

        if(!zodValidation.success){
            return res.status(400).json({error: zodValidation.error})
        }

        const {questionId , code , language , userCode} = req.body;
        const {userId} = req.body;

        const question = await prisma.question.findFirst({
            where:{
                id: questionId
            }
        });

        const problemSubmission = {
            questionId,
            code,
            language,
            userId,
            testCases: question?.testCases,
            config: question?.config,
            minTime: question?.minTime,
            difficulty: question?.difficulty,
            userCode
        }

        await redisQueueClient.lPush("submissions", JSON.stringify(problemSubmission));

        res.json({
            message: "Problem submitted successfully"
        });

    } catch(error){
        return res.status(500).json({error: (error as Error).message})
    }
}

export const getUserSubmissionsByQuestion = async(req:Request, res: Response)=>{
    try{

        const {questionId , userId} = req.body;
        
        if(!questionId || !userId){
            return res.status(400).json({message: "Question id and user id is required"});
        }

        const submissions = await prisma.submissions.findMany({
            where:{
                questionId,
                userId
            },
            orderBy:{
                createdAt: 'desc'
            },
        });

        return res.status(200).json({data: submissions , success:true});

    } catch(error){
        return res.status(500).json({error: (error as Error).message , success:false});
    }
}
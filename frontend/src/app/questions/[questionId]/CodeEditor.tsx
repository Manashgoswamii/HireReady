import { SelectMenu } from '@/components/SelectMenu';
import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAppSelector } from '@/redux-toolkit/Typed-hooks';
import { submitProblem } from '@/apis/apiFunctions/submitCode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';

const CodeEditor = ({ config, questionId, setMessage, setLoading, loading }: { config: any, questionId: string, setMessage: Function, setLoading: Function, loading: boolean }) => {
  const [language, setLanguage] = useState<string>('cpp');
  const [theme, setTheme] = useState<string>('vs-dark');
  const { token, user } = useAppSelector(state => state.auth);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [code, setCode] = useState<string | undefined>("");
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (code) {
      setCode("");
    }
  }, [language]);

  const submitCode = async () => {
    if (!token) {
      toast("Please login to submit code");
      setLoading(false);
      return;
    }

    if (code === "") {
      toast("Please write something");
      return;
    }

    setLoading(true);
    const socket = new WebSocket(process.env.NEXT_PUBLIC_BACKEND_URL_WS!);
    socket.onopen = () => {
      setSocket(socket);
      socket.send(JSON.stringify({ userId: user.id, close: false }));
    };

    await submitProblem(code + '\n' + config[language].executionCode, language, questionId, code!);

    socket.onmessage = (message) => {
      setMessage(JSON.parse(message.data));
      setLoading(false);
      socket.send(JSON.stringify({ userId: user.id, close: true }));
      socket.close();
    };
  };

  const askAI = async () => {
    if (!code || code.trim() === "") {
      toast("Please write some code first");
      return;
    }

    const questionText = config[language]?.question || "";

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "deepseek/deepseek-r1-0528:free",
          messages: [
            {
              role: "system",
              content: "You are a pro DSA problem solver. The user is stuck on this question and has written the code below. Give them a hint to help move forward."
            },
            {
              role: "user",
              content: `Question:\n${questionText}\n\nCode:\n${code}`
            }
          ]
        })
      });

      const data = await res.json();
      const aiReply = data.choices[0]?.message?.content || "No hint provided.";
      setAiResponse(aiReply);
      setModalOpen(true);
    } catch (err) {
      toast("Failed to get response from AI.");
    }
  };

  return (
    <div className='flex gap-3 pt-2 pl-2 h-full w-full flex-col'>
      <div className='flex justify-between '>
        <div className='flex gap-3'>
          <SelectMenu topic='language' options={["cpp", "javascript", "python"]} setState={setLanguage} />
          <SelectMenu topic='theme' options={["vs-dark", "vs-light"]} setState={setTheme} />
        </div>
        <div className='flex gap-3'>
          <Button
            className={`w-[80px] font-semibold bg-green-600 text-white hover:bg-green-700 ${loading ? "opacity-50" : "opacity-100"}`}
            onClick={askAI}
            disabled={loading}
          >
            Ask AI
          </Button>
          <Button className={`w-[80px] ${loading ? "opacity-50" : "opacity-100"}`} onClick={submitCode} disabled={loading}>Submit</Button>
        </div>
      </div>

      {config && (
        <Editor
          language={language}
          value={config[language].userCode}
          onChange={(value) => setCode(value)}
          theme={theme}
        />
      )}
      {!config && <Skeleton className='h-[90%] w-full p-2' />}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Hint</DialogTitle>
            <DialogClose className="absolute top-3 right-3">✕</DialogClose>
          </DialogHeader>
          <div className="whitespace-pre-wrap text-sm text-white mt-4 max-h-[80vh] overflow-y-auto">
            {aiResponse || "Loading..."}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default CodeEditor;

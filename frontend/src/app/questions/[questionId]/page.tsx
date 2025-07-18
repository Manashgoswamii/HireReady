"use client"

import React, { useEffect , useState } from 'react'
import { getQuestionsById } from '@/apis/apiFunctions/questions';
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
  } from "@/components/ui/resizable"
import QuestionPage from './QuestionPage';
import Navbar from '@/components/Navbar';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
  } from "@/components/ui/tabs"
import CodeEditor from './CodeEditor';
import OutputBox from './OutputBox';
import { getSubmissionsForQuestion } from '@/apis/apiFunctions/submitCode';
import SubmissionsPage from './SubmissionsPage';

const Page = ({params}:{params:{questionId:string}}) => {

    const {questionId} = params;

    const [question , setQuestion] = useState<any>();
    const [message, setMessage] = useState<any>(null);
    const [ loading , setLoading] = useState<boolean>(false);
    const [submisions ,setSubmissions] = useState<any>(null);



    useEffect(()=>{

        const fetchQuestion = async()=>{
            const question = await getQuestionsById(questionId);
            setQuestion(question);
        }

        fetchQuestion();

    } , []);

    //ws connection to get results

    const fetchSubmisions = async()=>{
        const res = await getSubmissionsForQuestion(question?.id);
        setSubmissions(res);
    }
    
  return (
    <div className='w-[100vw] h-[100vh] overflow-hidden'>
        <Navbar/>
        <ResizablePanelGroup
        direction="horizontal"
        className="rounded-lg border relative bottom-12"  
      >
        <ResizablePanel defaultSize={40} className='h-[100vh]'>
        <Tabs defaultValue="Questions" className="w-full p-2">
        { question &&(
            <TabsList className="grid w-full grid-cols-3">
             
                <TabsTrigger value="Questions">Questions</TabsTrigger>
                <TabsTrigger value="Submissions" onClick={fetchSubmisions}>Submissions</TabsTrigger>
                <TabsTrigger value="Discussion">Discussion</TabsTrigger>
             
            </TabsList>
            )
        }
            
            <TabsContent value='Questions' className='w-[100%] h-[90vh]'>
                <QuestionPage question= {question} />
              
            </TabsContent>
            <TabsContent value="Submissions">
                <SubmissionsPage submissions={submisions}/>
            </TabsContent>
            <TabsContent value="Discussion">
                Coming Soon
            </TabsContent>
        </Tabs>
        
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={70}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={60}>
                <CodeEditor config={question?.config} questionId={question?.id} setMessage={setMessage} setLoading={setLoading} loading={loading}/>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={40}>
              <OutputBox examples={question?.examples} message={message} loading = {loading}/>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

export default Page
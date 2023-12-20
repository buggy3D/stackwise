'use client';

import { useMemo, useRef, useState } from 'react';
import type { Message } from 'ai/react';
import { useChat } from 'ai/react';
import type { AgentStep } from 'langchain/schema';
import { toast } from 'react-toastify';

import 'react-toastify/dist/ReactToastify.css';

export enum CrawlMethod {
  FETCH = 'FETCH',
  EDGE_BROWSER = 'EDGE_BROWSER',
  PUPPETEER = 'PUPPETEER',
  APIFY = 'APIFY',
}

interface ChatHistoryProps {
  chatHistory: Message[];
  handleCancel: () => void;
}
type SourcesForMessages = Record<string, string[]>;

const placeholderAnswering = 'A: Answering…';

const ensureHttpProtocol = (urlString: string) => {
  if (!/^(?:f|ht)tps?\:\/\//.test(urlString)) {
    return `https://${urlString}`;
  }
  return urlString;
};

const isValidUrl = (urlString: string) => {
  const urlPattern =
    /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
  const prefixedUrlString = ensureHttpProtocol(urlString);
  return urlPattern.test(prefixedUrlString);
};

export function IntermediateStep(props: { message: Message }) {
  const parsedInput: AgentStep = JSON.parse(props.message.content);
  const action = parsedInput.action;
  const observation = parsedInput.observation;
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className={`mb-8 ml-auto flex max-w-[80%] cursor-pointer flex-col whitespace-pre-wrap rounded bg-green-600 px-4 py-2`}
    >
      <div
        className={`text-right ${expanded ? 'w-full' : ''}`}
        onClick={(e) => setExpanded(!expanded)}
      >
        <code className="mr-2 rounded bg-slate-600 px-2 py-1 hover:text-blue-600">
          🛠️ <b>{action.tool}</b>
        </code>
        <span className={expanded ? 'hidden' : ''}>🔽</span>
        <span className={expanded ? '' : 'hidden'}>🔼</span>
      </div>
      <div
        className={`max-h-[0px] overflow-hidden transition-[max-height] ease-in-out ${
          expanded ? 'max-h-[360px]' : ''
        }`}
      >
        <div
          className={`mt-1 max-w-0 rounded bg-slate-600 p-4 ${
            expanded ? 'max-w-full' : 'transition-[max-width] delay-100'
          }`}
        >
          <code
            className={`max-h-[100px] overflow-auto opacity-0 transition delay-150 ease-in-out ${
              expanded ? 'opacity-100' : ''
            }`}
          >
            Tool Input:
            <br></br>
            <br></br>
            {JSON.stringify(action.toolInput)}
          </code>
        </div>
        <div
          className={`mt-1 max-w-0 rounded bg-slate-600 p-4 ${
            expanded ? 'max-w-full' : 'transition-[max-width] delay-100'
          }`}
        >
          <code
            className={`max-h-[260px] overflow-auto opacity-0 transition delay-150 ease-in-out ${
              expanded ? 'opacity-100' : ''
            }`}
          >
            {observation}
          </code>
        </div>
      </div>
    </div>
  );
}

export function ChatMessageBubble(props: {
  message: Message;
  aiEmoji?: string;
  sources: any[];
}) {
  const colorClassName =
    props.message.role === 'user' ? 'bg-sky-600' : 'bg-slate-50 text-black';
  const alignmentClassName =
    props.message.role === 'user' ? 'ml-auto' : 'mr-auto';
  const prefix = props.message.role === 'user' ? '🧑' : props.aiEmoji;
  return (
    <div
      className={`${alignmentClassName} ${colorClassName} mb-8 flex max-w-[80%] rounded px-4 py-2`}
    >
      <div className="mr-2">{prefix}</div>
      <div className="flex flex-col whitespace-pre-wrap">
        <span>{props.message.content}</span>
        {props.sources && props.sources.length ? (
          <>
            <code className="mr-auto mt-4 rounded bg-slate-600 px-2 py-1">
              <h2>🔍 Sources:</h2>
            </code>
            <code className="mr-2 mt-1 rounded bg-slate-600 px-2 py-1 text-xs">
              {props.sources?.map((source, i) => (
                <div className="mt-2" key={'source:' + i}>
                  {i + 1}. &quot;{source.pageContent}&quot;
                  {source.metadata?.loc?.lines !== undefined ? (
                    <div>
                      <br />
                      Lines {source.metadata?.loc?.lines?.from} to{' '}
                      {source.metadata?.loc?.lines?.to}
                    </div>
                  ) : (
                    ''
                  )}
                </div>
              ))}
            </code>
          </>
        ) : (
          ''
        )}
      </div>
    </div>
  );
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  chatHistory,
  handleCancel,
}) => (
  <div
    className={`mt-4 p-4 ${
      chatHistory.length > 0 && 'border-t'
    } border-gray-200`}
  >
    <ul className="mt-2">
      {chatHistory.map((entry, index) => (
        <li
          key={index}
          className={`mt-1 ${index % 2 !== 0 ? 'text-left' : 'text-right'}`}
        >
          <span
            className={`inline-block ${
              index % 2 !== 0 ? 'bg-blue-100' : 'bg-green-100'
            } rounded px-2 py-1`}
          >
            {entry.content}
            {entry.content === placeholderAnswering && (
              <button
                type="button"
                onClick={handleCancel}
                className="ml-2 rounded-md border bg-red-600 px-2 py-1 text-white hover:bg-red-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              >
                Stop
              </button>
            )}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

const RAGURLWithLangchain = () => {
  const [sourcesForMessages, setSourcesForMessages] =
    useState<SourcesForMessages>({});
  const [inputUrl, setInputUrl] = useState<string>(
    'https://www.waggledance.ai',
  );
  const [showIntermediateSteps, setShowIntermediateSteps] = useState(false);
  const [intermediateStepsLoading, setIntermediateStepsLoading] =
    useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const inputUrlRef = useRef<HTMLInputElement | null>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);

  const hasValidUrl = useMemo(() => isValidUrl(inputUrl), [inputUrl]);

  const chatHistory = useMemo(() => {
    return Object.entries(sourcesForMessages).map(
      ([index, sources]) =>
        ({
          id: index,
          content: sources.join(' '),
          role: Number.parseInt(index) % 2 === 0 ? 'user' : 'assistant',
        }) as Message,
    );
  }, [sourcesForMessages]);

  const {
    messages,
    input,
    error,
    setInput,
    handleInputChange,
    handleSubmit,
    isLoading,
    setMessages,
  } = useChat({
    api: '/api/rag-url-with-langchain',
    experimental_onFunctionCall(messages, functionCall) {
      console.log(messages);
      return Promise.resolve();
    },
    onResponse(response) {
      const sourcesHeader = response.headers.get('x-sources');
      const sources = sourcesHeader ? JSON.parse(atob(sourcesHeader)) : [];
      const messageIndexHeader = response.headers.get('x-message-index');
      if (sources.length && messageIndexHeader !== null) {
        setSourcesForMessages({
          ...sourcesForMessages,
          [messageIndexHeader]: sources,
        });
      }
    },
    onFinish(message: Message) {
      console.log('onFinish', message);
    },
    onError: (e) => {
      toast(e.message, {
        theme: 'dark',
      });
    },
  });

  // useEffect(() => {
  //   if (abortControllerRef?.current) {
  //     abortControllerRef?.current.abort();
  //   }
  // }, []);

  const sendMessage = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasValidUrl) {
      toast('Please enter a valid URL.');
      return;
    }
    if (messageContainerRef.current) {
      messageContainerRef.current.classList.add('grow');
    }
    if (!messages.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    if (isLoading ?? intermediateStepsLoading) {
      return;
    }

    const body = {
      url: inputUrl,
      chat: input,
      crawlMethod: CrawlMethod.PUPPETEER.toString(),
    };
    if (!showIntermediateSteps) {
      handleSubmit(event, {
        options: { body },
      });
    } else {
      setIntermediateStepsLoading(true);
      setInput('');
      abortControllerRef.current = new AbortController();
      const messagesWithUserReply = messages.concat({
        id: messages.length.toString(),
        content: input,
        role: 'user',
      });
      setMessages(messagesWithUserReply);

      try {
        console.log('inputUrl', inputUrl);

        const response = await fetch('/api/rag-url-with-langchain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: messagesWithUserReply,
            url: body.url,
            crawlMethod: body.crawlMethod,
          }),
          signal: abortControllerRef.current.signal,
        });

        const json = await response.json();
        setIntermediateStepsLoading(false);
        if (response.status === 200) {
          // Represent intermediate steps as system messages for display purposes
          const intermediateStepMessages = (json.intermediate_steps ?? []).map(
            (intermediateStep: AgentStep, i: number) => {
              return {
                id: (messagesWithUserReply.length + i).toString(),
                content: JSON.stringify(intermediateStep),
                role: 'system',
              };
            },
          );
          const newMessages = messagesWithUserReply;
          for (const message of intermediateStepMessages) {
            newMessages.push(message);
            setMessages([...newMessages]);
            await new Promise((resolve) =>
              setTimeout(resolve, 1000 + Math.random() * 1000),
            );
          }
          setMessages([
            ...newMessages,
            {
              id: (
                newMessages.length + intermediateStepMessages.length
              ).toString(),
              content: json.output,
              role: 'assistant',
            },
          ]);
        } else {
          if (json.error) {
            toast(json.error, {
              theme: 'dark',
            });
            throw new Error(json.error);
          }
        }
      } catch (error) {
        if (error.name !== 'AbortError') {
          toast('An error occurred while sending the message.');
        }
      } finally {
        setIntermediateStepsLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  return (
    <div className="mx-auto flex h-full w-full flex-col items-center justify-between p-4">
      <form onSubmit={sendMessage} className="w-full max-w-xl p-4">
        <input
          ref={inputUrlRef}
          type="text"
          value={inputUrl}
          onChange={(e) => setInputUrl(e.target.value)}
          placeholder="Enter URL"
          className="w-full rounded border p-2"
        />
        <input
          ref={inputRef}
          value={input}
          onChange={handleInputChange}
          placeholder="Enter your message"
          className="mt-2 w-full rounded border p-2"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || !hasValidUrl}
          className="mt-2 w-full rounded bg-blue-500 py-2 text-white hover:bg-blue-700 disabled:bg-blue-300"
        >
          {isLoading ? 'Loading...' : 'Send'}
        </button>
      </form>
      {/* <iframe
        src={inputUrl}
        className="h-full w-full"
        onError={(e) => {
          console.log('error', e);
        }}
        onLoadedData={(e) => {
          console.log('loaded data', e);
        }}
      ></iframe> */}
      <div
        className={`flex grow flex-col items-center overflow-hidden rounded p-4 md:p-8 ${
          messages.length > 0 ? 'border' : ''
        }`}
      >
        {messages.length === 0 ? <></> : ''}
        <div
          className="mb-4 flex w-full flex-col-reverse overflow-auto transition-[flex-grow] ease-in-out"
          ref={messageContainerRef}
        >
          {messages.length > 0
            ? [...messages].reverse().map((m, i) => {
                const sourceKey = (messages.length - 1 - i).toString();
                return m.role === 'system' ? (
                  <IntermediateStep key={m.id} message={m}></IntermediateStep>
                ) : (
                  <ChatMessageBubble
                    key={m.id}
                    message={m}
                    aiEmoji={'🤖'}
                    sources={sourcesForMessages[sourceKey]}
                  ></ChatMessageBubble>
                );
              })
            : ''}
        </div>
      </div>
      {/* <ChatHistory
        chatHistory={chatHistory}
        handleCancel={() => abortControllerRef.current?.abort()}
      /> */}
      {error && <p className="text-red-500">{error.message}</p>}
    </div>
  );
};

export default RAGURLWithLangchain;

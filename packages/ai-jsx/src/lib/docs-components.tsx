import { LLMx } from '../lib/index.ts';
import { ChatCompletion, SystemMessage, UserMessage } from './completion-components.tsx';
import { Document, Loader } from './docs.ts';

export interface DocsQAProps<Doc extends Document> {
  loader: Loader;
  question: string;
  docComponent: (props: { doc: Doc }) => LLMx.Node;
}
export async function DocsQA<Doc extends Document>(props: DocsQAProps<Doc>) {
  const docs = await props.loader();
  return (
    <ChatCompletion>
      <SystemMessage>
        You are a customer service agent. Answer questions truthfully. Here is what you know:
        {docs.map((doc) => (
          // TODO improve types
          // @ts-expect-error
          <props.docComponent doc={doc} />
        ))}
      </SystemMessage>
      <UserMessage>{props.question}</UserMessage>
    </ChatCompletion>
  );
}

import { LLMx } from '../../../../../dist/lib/index.js';
import React from './react';
import { graphql } from '@octokit/graphql';
import { ChatCompletion, SystemMessage, UserMessage } from '../../../../../dist/lib/completion-components.js';
import { Suspense } from 'react';
import { EventEmitter } from 'stream';
import _ from 'lodash';
import Image from 'next/image';

function Loading() {
  return <Image src="/loading.gif" width={100} height={100} alt="loading" />;
}

function QueryGitHub({ query }: { query: string }) {
  // The model responds with backticks that I can't seem to get rid of.

  return (
    <ChatCompletion>
      <SystemMessage>
        You are an expert at producing GraphQL queries to look up information from the GitHub API. You only respond with
        the GraphQL itself; you never respond with explanatory prose.
      </SystemMessage>
      <UserMessage>{query}</UserMessage>
    </ChatCompletion>
  );
}

const ghToken = process.env.GITHUB_TOKEN;
if (!ghToken) {
  throw new Error('Please set the GITHUB_TOKEN environment variable.');
}

async function FetchGitHubGraphQL({ graphQLQuery }: { graphQLQuery: LLMx.Node }, context: LLMx.RenderContext) {
  console.log(context);
  let cleanedQuery = await context.render(graphQLQuery);
  // We can't get the model to stop giving us backticks, so we'll just strip them out.
  if (cleanedQuery.startsWith('```')) {
    cleanedQuery = cleanedQuery.slice(3);
  }
  if (cleanedQuery.endsWith('```')) {
    cleanedQuery = cleanedQuery.slice(0, cleanedQuery.length - 3);
  }
  const response = await graphql(cleanedQuery, {
    headers: {
      authorization: `token ${ghToken}`,
    },
  });
  return JSON.stringify(response);
}

function FormatAsHtml({ children }: { children: LLMx.Node }) {
  return (
    <ChatCompletion>
      <SystemMessage>
        You are an expert designer. The user will give you a JSON blob, and you respond with styled HTML to display it.
        Use TailwindCSS clases to style your HTML. Respond with only the HTML. Do not respond with explanatory prose.
      </SystemMessage>
      <UserMessage>{children}</UserMessage>
    </ChatCompletion>
  );
}

function FormatAsProse({ children }: { children: LLMx.Node }) {
  return (
    <ChatCompletion>
      <SystemMessage>
        You are an expert JSON interpreter. You take JSON responses from the GitHUB API and render their contents as
        clear, succint English. For instance, if you saw, {'{'}"issues": [{'{'}"id": 1234, "title": "test",
        "description": "my description"{'}'}]{'}'}, you would respond with, "Issue 1234: Test. (my description)".
      </SystemMessage>
      <UserMessage>{children}</UserMessage>
    </ChatCompletion>
  );
}

export function Trivial() {
  return <>trivial response</>;
}

export function NaturalLanguageGitHubSearch({
  query,
  outputFormat,
}: {
  query: string;
  outputFormat: 'prose' | 'html';
}) {
  // The model responds with backticks that I can't seem to get rid of.

  const ghResults = <FetchGitHubGraphQL graphQLQuery={<QueryGitHub query={query} />} />;

  return outputFormat == 'prose' ? (
    <FormatAsProse>{ghResults}</FormatAsProse>
  ) : (
    <FormatAsHtml>{ghResults}</FormatAsHtml>
  );
}

async function Defer(props: { emitter: any; index: number }) {
  return await new Promise((resolve) => {
    props.emitter.once(`value-${props.index}`, resolve);
  });
}

async function AIBuffered({ children }: { children: React.ReactNode }) {
  const rendered = await LLMx.createRenderContext().render(children);
  return <div className="contents-generated-by-ai-buckle-up-buddy" dangerouslySetInnerHTML={{ __html: rendered }} />;
}

function AIStream({ children }: { children: React.ReactNode }) {
  const maxIndex = 10000;
  const emitter = new EventEmitter();

  const stream = LLMx.createRenderContext().renderStream(children);
  function handleFrame({ value: frame, done }: { value: string; done: boolean }) {
    if (frame) {
      frame.split('').forEach((char, index) => {
        emitter.emit(`value-${index}`, char);
      });
    }
    if (!done) {
      stream.next().then(handleFrame);
    }
  }
  stream.next().then(handleFrame);

  return (
    <>
      {_.range(maxIndex).map((i) => (
        <Suspense>
          <Defer emitter={emitter} index={i} />
        </Suspense>
      ))}
    </>
  );
}

export async function AI({
  children,
  renderDirectlyIntoDOM,
}: {
  children: React.ReactNode;
  renderDirectlyIntoDOM?: boolean;
}) {
  if (renderDirectlyIntoDOM) {
    return (
      <Suspense fallback={<Loading />}>
        <AIBuffered>{children}</AIBuffered>
      </Suspense>
    );
  }

  return <AIStream>{children}</AIStream>;

  // const rendered = '<p>fak</p>';

  // return renderDirectlyIntoDOM ? (
  //
  // ) : (
  //   <React.Fragment>{rendered}</React.Fragment>
  // )
}

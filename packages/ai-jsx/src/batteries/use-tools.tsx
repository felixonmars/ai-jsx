/**
 * This module provides the {@link UseTools} component to allow a Large Language Model to
 * invoke external functions.
 * @packageDocumentation
 */

import {
  ChatCompletion,
  FunctionCall,
  FunctionParameter,
  FunctionResponse,
  SystemMessage,
  UserMessage,
} from '../core/completion.js';
import { Node, RenderContext, isElement } from '../index.js';
import z from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AIJSXError, ErrorCode } from '../core/errors.js';

const toolChoiceSchema = z.object({
  nameOfTool: z.string(),
  parameters: z.record(z.string(), z.any()),
  responseToUser: z.string(),
});
export type ToolChoice = z.infer<typeof toolChoiceSchema> | null;

function ChooseTools(props: Pick<UseToolsProps, 'tools' | 'userData' | 'query'>): Node {
  return (
    <ChatCompletion>
      <SystemMessage>
        You are an expert agent who knows how to use tools. You can use the following tools:
        {Object.entries(props.tools).map(([toolName, tool]) => (
          <>
            {toolName}: Description: {tool.description}. Schema: {JSON.stringify(tool.parameters)}.
          </>
        ))}
        The user will ask you a question. Pick the tool that best addresses what they're looking for. Which tool do you
        want to use? Name the tool, identify the parameters, and generate a response to the user explaining what you're
        doing. Do not answer the user's question itself. Your answer should be a JSON object matching this schema:{' '}
        {JSON.stringify(zodToJsonSchema(toolChoiceSchema))}. Make sure to follow the schema strictly and do not include
        any explanatory prose prefix or suffix.{' '}
        {props.userData && <>When picking parameters, choose values according to this user data: {props.userData}</>}
        If none of the tools seem appropriate, or the user data doesn't have the necessary context to use the tool the
        user needs, respond with `null`.
      </SystemMessage>
      <UserMessage>Generate a JSON response for this query: {props.query}</UserMessage>
    </ChatCompletion>
  );
}

async function InvokeTool(
  props: { tools: Record<string, Tool>; toolChoice: Node; fallback: Node },
  { render }: RenderContext
) {
  // TODO: better validation around when this produces unexpected output.
  const toolChoiceLLMOutput = await render(props.toolChoice);
  let toolChoiceResult: ToolChoice;
  try {
    const parsedJson = JSON.parse(toolChoiceLLMOutput);
    if (parsedJson === null) {
      return props.fallback;
    }
    toolChoiceResult = toolChoiceSchema.parse(parsedJson);
  } catch (e: any) {
    const error = new AIJSXError(
      `Failed to parse LLM output into a tool choice: ${e.message}. Output: ${toolChoiceLLMOutput}`,
      ErrorCode.ModelOutputCouldNotBeParsedForTool,
      'runtime',
      { toolChoiceLLMOutput }
    );
    throw error;
  }
  if (!(toolChoiceResult.nameOfTool in props.tools)) {
    throw new AIJSXError(
      `LLM hallucinated a tool that does not exist: ${toolChoiceResult.nameOfTool}.`,
      ErrorCode.ModelHallucinatedTool,
      'runtime',
      { toolChoiceResult }
    );
  }
  const tool = props.tools[toolChoiceResult.nameOfTool];
  const toolResult = await tool.func(toolChoiceResult.parameters);

  // TDOO: Restore this once we have the logger attached to the render context.
  // log.info({ toolChoice: toolChoiceResult }, 'Invoking tool');

  return (
    <ChatCompletion>
      <SystemMessage>
        You are a tool-using agent. You previously choose to use a tool, and generated this response to the user:
        {toolChoiceResult.responseToUser}
        When you ran the tool, you got this result: {JSON.stringify(toolResult)}
        Using the above, provide a final response to the user.
      </SystemMessage>
    </ChatCompletion>
  );
}

/**
 * Represents a tool that can be provided for the Large Language Model.
 */
export interface Tool {
  /**
   * A description of what the tool does.
   */
  description: string;

  /**
   * A map of parameter names to their description and type.
   */
  parameters: Record<string, FunctionParameter>;

  /**
   * A function to invoke the tool.
   */
  // Can we use Zod to do better than any[]?
  func: (...args: any[]) => string | number | boolean | null | undefined | Promise<string | number | boolean | null>;
}

/**
 * Properties to be passed to the {@link UseTools} component.
 */
export interface UseToolsProps {
  /**
   * The tools the AI can use.
   */
  tools: Record<string, Tool>;

  /**
   * A query the AI will use to decide which tool to use, and what parameters to invoke it with.
   */
  query: string;

  /**
   * A fallback response to use if the AI doesn't think any of the tools are relevant.
   */
  fallback: Node;

  /**
   * User data the AI can use to determine what parameters to invoke the tool with.
   *
   * For instance, if the user's query can be "what's the weather like at my current location", you might pass `userData` as { "location": "Seattle" }.
   */
  userData?: string;
}

/**
 * Give a model tools it can use, like a calculator, or ability to call an API.
 *
 * This is conceptually similar to [chatGPT plugins](https://openai.com/blog/chatgpt-plugins).
 *
 * @example
 * ```tsx
 *  async function turnLightsOn() { ... Code to turn lights on ... }
 *  async function turnLightsOff() { ... Code to turn lights off ... }
 *  // Activate a scene in the user's lighting settings, like "Bedtime" or "Midday".
 *  async function activeScene({sceneName}: {sceneName: string}) { ... Code to activate a scene ... }
 *
 *  import z from 'zod';
 *  const tools: Record<string, Tool> = {
 *    turnLightsOn: {
 *      description: "Turn the lights on in the user's home",
 *      parameters: {},
 *      func: turnLightsOn,
 *    },
 *    turnLightsOff: {
 *      description: "Turn the lights off in the user's home",
 *      parameters: {},
 *      func: turnLightsOff,
 *    },
 *    activeScene: {
 *      description: `Activate a scene in the user's lighting settings, like "Bedtime" or "Midday".`,
 *      parameters: {
 *        sceneName: {
 *          description: "The scene to activate the lighting in.",
 *          type: "string",
 *          required: true,
 *        },
 *      },
 *      func: activeScene,
 *    },
 *  };
 *
 * <UseTools
 *    tools={tools}
 *    fallback="Politely explain you aren't able to help with that request."
 *    query={ "You control a home automation system. The user has requested you take some
 *       action in their home: " + userRequest }
 * </UseTools>;
 * ```
 *
 */
export async function* UseTools(props: UseToolsProps, { render }: RenderContext) {
  try {
    const rendered = yield* render(<UseToolsFunctionCall {...props} />);
    return rendered;
  } catch (e: any) {
    if (e.code === ErrorCode.ChatModelDoesntSupportFunctions) {
      return <UseToolsPromptEngineered {...props} />;
    }
    throw e;
  }
}

/**
 * An implementation of <UseTools/> that uses {@link ChatCompletion}'s {@link FunctionDefinition} capability to call
 * functions. The chat model in scope must support Function Calls for this component.
 */
export async function* UseToolsFunctionCall(props: UseToolsProps, { render }: RenderContext) {
  const messages = [
    <SystemMessage>You are a smart agent that may use functions to answer a user question.</SystemMessage>,
  ];
  if (props.fallback) {
    messages.push(
      <SystemMessage>Here's the fallback strategy/message if something failed: {props.fallback}</SystemMessage>
    );
  }
  messages.push(<UserMessage>{props.query}</UserMessage>);

  do {
    const model_response = (
      <ChatCompletion
        functionDefinitions={Object.entries(props.tools).map(([toolName, tool]) => ({
          name: toolName,
          description: tool.description,
          parameters: tool.parameters,
        }))}
      >
        {messages}
      </ChatCompletion>
    );

    const renderResult = yield* render(model_response, { stop: (el) => el.tag == FunctionCall });

    if (isElement(renderResult[0])) {
      // Model has generated a <FunctionCall/> element.
      if (renderResult.length > 1 || renderResult[0].tag != FunctionCall) {
        throw new AIJSXError(
          `Unexpected result from render ${renderResult.join(', ')}`,
          ErrorCode.ModelOutputCouldNotBeParsedForTool,
          'runtime'
        );
      }

      // Append the received function call to the messages.
      const functionCall = renderResult[0];
      messages.push(functionCall);
      yield functionCall;
      // Call the selected function and append the result to the messages.
      let response;
      try {
        const callable = props.tools[functionCall.props.name].func;
        response = await callable(functionCall.props.args);
      } catch (e: any) {
        response = `Function called failed with error: ${e.message}.`;
      } finally {
        const functionResponse = <FunctionResponse name={functionCall.props.name}>{response}</FunctionResponse>;
        yield functionResponse;
        messages.push(functionResponse);
      }
    } else {
      // Model has generated an assistant message which is the final response.
      return renderResult.join('');
    }
  } while (true);
}

/**
 * An implementation of <UseTools/> that uses plain prompt engineering to choose a tool to be called.
 * This implementation does not need the underlying chat model to support Function Calls.
 */
export function UseToolsPromptEngineered(props: UseToolsProps) {
  return <InvokeTool tools={props.tools} toolChoice={<ChooseTools {...props} />} fallback={props.fallback} />;
}

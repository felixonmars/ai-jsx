---
sidebar_position: 1
---

# Guide for AI Newcomers

Large Language Models (LLMs) are powerful tools, representing a paradigm shift in how we build and use software. Machines now have the ability to reason and understand natural language as well as source code. We predict over the coming years, incumbents will either remake themselves, or be disrupted by AI-native products and platforms.

Just like in other types of programming, you can often get by with a simple solution until you need the heavier-duty tools. There are many techniques and concepts in AI programming, but you can make something useful without knowing them all.

## Using LLMs Wisely

LLMs are magical when you use them for things they're good at. However, they can be really frustrating when you try to ask them to do something they're not well-equipped to handle.

### LLM Strengths 💪🏽

LLMs are great at understanding and generating natural language and code.

They are strong at tasks like:

- **Layout:** Given a set of React components and a data object, arrange the React components in a visually-pleasing way.
- **Summarization**: Read documents and summarize them.
- **Style Cloning**: Read a lot of your writing, then generate more writing in your voice.
- **Code Generation**: Look at API documentation, then write code to use it.

### LLM Frustration 😖

LLMs, by themselves, aren't great at:

- Complex deterministic logic (e.g. math or code execution)
- Questions requiring outside knowledge (where accuracy really matters)
- Analysis on structured data.
- Taking actions in the outside world.

Fortunately, the community has developed many approaches to address the above shortcomings. The LLM ends up being just one piece of the bigger application.

### LLMs Have Context and Work Best with Help

To build an intuition for what the LLM is good for, think of it kind of like a person. A person who can pass the [LSAT](https://en.wikipedia.org/wiki/Law_School_Admission_Test) but who also sometimes makes silly reasoning mistakes. People can do multiplication but we wouldn't expect someone to be great at 5-digit multiplication unless we give them some help (e.g. a calculator). And if we asked someone a question about the French Revolution, we'd feel much more confident in the answers if we gave them access to Wikipedia.

Models are also limited by the companies that own and operate them (e.g. for safety and to limit liability on behalf of the operating company). For instance, if you ask OpenAI's models how to make anthrax, it'll refuse to tell you. ([Unless you're clever](https://www.jailbreakchat.com/)).

With today's level of accuracy, LLMs work best for tasks that are fault-tolerant or have a human in the loop. It's no accident that Microsoft is leaning so hard on the Copilot branding across all its AI integrations. If you have a human in the loop, you can provide a ton of value, even if the model output isn't perfect, because editing a pretty-good response is much easier for a human than generating a response wholesale.

Be wary of the "radio shows on TV" effect, where the first work in a new paradigm (TV) is just a port of the old paradigm (radio), rather than truly leveraging the new medium. We may need to rethink fundamental UX assumptions to find the best ways to make AI-native apps.

## Prompt Engineering

The interface to the model is the natural language we give it in the prompt. The art of crafting these prompts is called "Prompt Engineering". There are many resources about this, including online courses and YouTube videos.

Although there are best practices you can learn, prompt engineering is fundamentally an exploratory, guess-and-check process. Exploring what the models can do and how they behave is more akin to biology than traditional computer science.

There are general heuristics you can follow (e.g. "be specific"), but often you'll find tweaking the language (e.g. saying "you are an expert" rather than "you are great at this") can yield meaningfully different results.

The key intuition is that models are trained to imitate what they've read on the internet. So if you say "answer this question as if you're a physics expert", you'll get better results than if you say "answer this question like a child".

As models improve, prompt engineering will become less necessary, because the models will be better at figuring out what you want.

### Feedback Loop

Imagine you have a workflow with two steps:

1. Tweaking a prompt
2. Re-running your program to check the results

Every model call is non-deterministic. This means you can get different results each time even if you don't change the prompt.

So how do we figure out if our prompt changes are having an impact? One thing that works well is to set up our program to produce a batch of outputs at once. Additionally, it's best to make a single change at a time. If you change several things, you won't know what to caused any change in output, robbing you of a chance to build your intuition.

### Context Window = Prompt Length + Model's Response

Each model API has a context window that it supports. For instance, [GPT-4 Standard](https://platform.openai.com/docs/models/gpt-4) is 8,192 tokens. (A [token](https://platform.openai.com/tokenizer) is a common grouping of characters.)

The context window is the combined length of the prompt and the model's response. Effectively this means we have a budget (i.e. the size of the context window) that is shared between the input and the output. As we increase the length of the prompt to the model, we decrease the potential length of the response from the model.

Intuitively, think about the context window as the model's working memory. When you think about a problem, you're able to hold some of the relevant information in your head at one time. When the problem gets too complicated, you rely on external aids (like written notes). The context window is similar – it's what the model has access to at once. (But, unlike humans, the model has perfect recall of everything in its window.)

### Thinking Out Loud

When you ask a human a question, you can say, "answer with one word, but think carefully before you answer". Models can't do that. Every token they generate takes the same amount of cognitive time. So, to get models to think harder, you ask them for longer responses. This is the basis behind the [Chain of Thought](https://arxiv.org/abs/2201.11903) family of techniques.

So, as you're setting up your prompts, it's best to get the model to show its work for more complicated problems.

### See Also

- [OpenAI: GPT Best Practices](https://platform.openai.com/docs/guides/gpt-best-practices)
- [Prompt Engineering Guide](https://www.promptingguide.ai/)

When you need robust tools, you may wish to use something like [HumanLoop](https://humanloop.com/) to A/B test different prompts in production.

## Additional Concepts

So far we've covered what LLMs are good/bad at and how to think a bit about constructing prompts for the model. What follows are some other concepts that we think will be useful as you build AI-powered applications.

### Using Tools

On their own, LLMs can't interact with the outside world. If you want to give them that capability, you can give them tools. ([ChatGPT Plugins](https://openai.com/blog/chatgpt-plugins) are a well-known implementation of this.)

For instance, with tools, you can enable your LLM-powered app to write to a database, call a web API, or look up data about the logged-in user.

The basic approach is:

1. You write a function that implements the tool.
1. You tell the LLM how to use the tool.

In AI.JSX, this looks like:

```tsx
// Implement a function for the LLM to call.
/**
 * Activate a scene in the user's lighting settings, like "Bedtime" or "Midday".
 */
async function activateScene({sceneName}: {sceneName: string}) {}

// Describe to the LLM what's available
import z from 'zod';
const tools: Record<string, Tool> = {
  activateScene: {
    description: `Activate a scene in the user's lighting settings, like "Bedtime" or "Midday".`,
    parameters: parameters: {
      sceneName: {
        description: "The scene to activate the lighting in.",
        type: "string",
        required: true,
      },
    },
    func: activateScene,
  },
};

// Provide the tools to the agent
<UseTools tools={tools} fallback="Politely explain you aren't able to help with that request.">
  <SystemMessage>
    You control a home automation system. The user will request an action in their home. You should take an action and
    then generate a response telling the user what you've done.
  </SystemMessage>
  <UserMessage>{userRequest}</UserMessage>
</UseTools>;
```

More detail: [`UseTools` API docs](../api/modules/batteries_use_tools#usetools).

### Accessing Knowledge (AKA "Docs QA")

LLMs have "soft knowledge" of the world, but if you just ask a question without providing any context, they're prone to [hallucination](<https://en.wikipedia.org/wiki/Hallucination_(artificial_intelligence)>). Additionally, because LLMs are only trained on public data, they don't have context on private data your or your app may care about.

To address this, the community has developed a variety of techniques known collectively as "Document Q&A" (DocsQA). DocsQA enables your application to provide the LLM with a set of content/documents that serve as the source of truth. This avoids hallucination and enables the model to provide better responses.

For more details, see the [DocsQA Guide](./docsqa.md).

### Streaming

To improve responsiveness and perceived performance, it's better to stream your results to the user. Each word should be shown to the user as soon as it's available, rather than waiting until your entire response is done. This also allows the user to cancel the response if it's not relevant or if things are going in the wrong direction.

In AI.JSX, streaming happens for you automatically.

```tsx
function App() {
  return (
    <ChatCompletion>
      <SystemMessage>You are an assistant who only uses one syllable words.</SystemMessage>
      <UserMessage>Why is the sky blue?</UserMessage>
    </ChatCompletion>
  );
}
AI.createRenderContext().render(<App />, {
  map: handlePartialResults,
});
```

The "pit of success" in AI.JSX is your program being automatically parallelized and streamed to the caller.

More details on streaming can be found in the [Performance Guide](./performance.md).

### Semantic Similarity ("Embeddings")

LLMs can tell us how related two pieces of text are. An embedding is a very long vector locating a given piece of text in semantic space. We could imagine a model that embeds according to this scheme:

```
[
  how_related_is_the_text_to_japan,
  how_happy_is_the_text,
  does_the_text_discuss_colors
]
```

So the text "I love the bright Japense cherry blossoms" might be encoded as `[1, 1, 1]`. And the text "I'm sad that the sky in New York is orange today" might be encoded as `[0, 0, 1]`.

(Actual embedding vectors are thousands of dimensions long.)

You can use embeddings for any task where you want to know how related things are, what clusters they form, etc. Possible usecases include:

- Finding related GitHub issues
- Taking an emotional temperature of employees based on how they are chatting in Slack today
- Finding all the fight scenes in a book

AI.JSX automatically generates and uses embeddings in our [DocsQA](./docsqa.md) implementation.

For more information on embeddings, see the [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings/what-are-embeddings) docs.

### Recommended Dev Workflow

When you're considering building an AI app, the most fundamental question is whether the model is capable of doing what you want it to. It's best to test this in a [playground environment](https://platform.openai.com/playground) before you write code. (You can also use a tool like [Poe](https://poe.com/) to try your query against many models at once.)

For example, if you plan to prompt the model with some docs, then ask the model questions about it, start by manually pasting the relevant docs into the prompt and asking your question. If the model doesn't perform well here, there's no point coding the rest of the [docs process](#accessing-knowledge-aka-docs-qa).

Start with the best model (GPT-4) and work your way down. Other models may be faster or cheaper, but none of that matters if the accuracy isn't there.

### What About Fine Tuning?

Fine tuning is when you train a model on top of a base model, using your own dataset. This is not recommended until you know you have a strong need for it; prompt composition can get you quite far, and is much more flexible than fine tuning.

When you fine tune, you've baked a set of data into the model. If you realize some of it is bad, you have to revert to an older checkpoint, and rerun the fine tune without that data.

Conversely, with prompt composition, if you realize some data isn't helpful, you simply update your AI.JSX program to no longer include that data.

Fine tuning also makes it harder to take advantage of base model updates. When GPT-4.5 comes out, if you've fine tuned on GPT-4, you'll be behind until you repeat your tuning process. However, if you're doing prompt composition, then you automatically can use GPT-4.5.

### See Also

- [OpenAI: State of GPT](https://www.youtube.com/watch?v=bZQun8Y4L2A). Microsoft Build presentation from top AI researcher Andrej Karpathy. A great overview of how the models work and tips for how to use them most effectively.
- [OpenAI: GPT Best Practices](https://platform.openai.com/docs/guides/gpt-best-practices)
- [Anthropic Guidance](https://console.anthropic.com/docs/prompt-design)
- [Poe](https://poe.com/) – chat with many different models (OpenAI, Anthropic, etc) at once.
- [Perplexity](https://www.perplexity.ai/) – AI-powered search.

## Case Study: Avoid Asking the LLM to do Something Deterministic

Consider an AI app that can ask a group of people when they're available to hang out, then find the mutual free times.

The AI will be great at asking people what their availability is. But you might be tempted to do the whole thing in AI, and also ask it to compute the mutual free time. That approach might look something like this:

```tsx
<ChatCompletion>
  <SystemMessage>You are a planning agent. The user will give you a list of free times. Respond with the time everyone is available</SystemMessage>
  <UserMessage>
    {availability.map(({person, times}) => <>{person}'s availability is: "{times}")}
    {/* this would produce something like:
          Alice's availability is "afternoons"
          Bob's availability is "mornings"
          Carol's availability is "any time between 2 and 9pm"
    */}
  </UserMessage>
</ChatCompletion>
```

This very well may work in many cases. But computing an intersection of time spans is a deterministic task that traditional computing is very good at. So for a more reliable approach, we recommend:

```tsx
interface PersonAvailability {
  name: string;

  /**
   * A list of hours (0-23) in which the user is available.
   */
  hoursAvailable: number[];
}

// Format the user's availability as a JSON object
const availability: PersonAvailability = await AI.createRenderContext().render(
  <JsonOutput>
    <ChatCompletion>
      <SystemMessage>You are an English-to-JSON translator. The user will give you a list of people's availabilities.
        Respond with an array of PersonAvailability objects, following this type:

        interface PersonAvailability {'{'}
          name: string;

          /**
           * A list of hours (0-23) in which the user is available.
           */
          hoursAvailable: number[];
        {'}'}
      </SystemMessage>
      <UserMessage>
        {availability.map(({person, times}) => <>{person}'s availability is: "{times}")}
      </UserMessage>
    </ChatCompletion>
  </JsonOutput>
)
```

Now we have `availability` as a nicely-structured JSON object, and can do deterministic computation on it to find our result. (Of course, this is the type of function that an AI would be very good at generating. But the ideal workflow is for you to generate it manually, inspect it, test it, then deploy it in your app, rather than asking the AI to do it on the spot.)

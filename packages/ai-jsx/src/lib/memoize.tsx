import { LLMx } from '../lib/index.ts';
import { Renderable } from './llm.ts';

let memoizedId = 0;
export const isMemoizedSymbol = Symbol('isMemoized');

export function memo(renderable: LLMx.Renderable): LLMx.Node {
  /**
   * The memoization is fully recursive.
   */
  if (typeof renderable !== 'object' || renderable === null) {
    return renderable;
  }
  if (Array.isArray(renderable)) {
    return renderable.map(memo);
  }
  if (LLMx.isElement(renderable)) {
    if (isMemoizedSymbol in renderable.props) {
      return renderable;
    }

    // N.B. The memoization applies per-RenderContext -- if the same component is rendered under
    // two different RenderContexts, it won't be memoized.
    const memoizedValues = new WeakMap<LLMx.RenderContext, LLMx.Renderable>();
    const newElement = {
      ...renderable,
      render: (ctx: LLMx.RenderContext) => {
        if (memoizedValues.has(ctx)) {
          return memoizedValues.get(ctx);
        }

        const memoizedValue = memo(renderable.render(ctx));
        memoizedValues.set(ctx, memoizedValue);
        return memoizedValue;
      },
    };
    Object.freeze(newElement);

    const Memoized = () => newElement;
    return (
      <Memoized id={++memoizedId} {...{ [isMemoizedSymbol]: true }}>
        {newElement}
      </Memoized>
    );
  }
  if (renderable instanceof Promise) {
    const memoizedRenderable = renderable.then(memo);
    const MemoizedPromise = () => memoizedRenderable;
    return <MemoizedPromise id={++memoizedId} {...{ [isMemoizedSymbol]: true }} />;
  }

  // It's an async generator (which is mutable). We set up some machinery to buffer the
  // results so that we can create memoized generators as necessary.
  const generator = renderable;
  const sink: Renderable[] = [];
  let completed = false;
  let nextPromise: Promise<void> | null = null;

  async function* MemoizedGenerator(): AsyncGenerator<LLMx.Renderable> {
    let index = 0;
    while (true) {
      if (index < sink.length) {
        yield sink[index++];
        continue;
      } else if (completed) {
        break;
      } else if (nextPromise == null) {
        nextPromise = generator.next().then((result) => {
          if (result.done) {
            completed = true;
          } else {
            sink.push(memo(result.value));
          }
          nextPromise = null;
        });
      }

      await nextPromise;
    }
  }

  return <MemoizedGenerator id={++memoizedId} {...{ [isMemoizedSymbol]: true }} />;
}

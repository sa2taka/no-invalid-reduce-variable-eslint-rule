import { Node } from "estree";

export type Visitor = (node: Node) => typeof SKIP | void;

export const SKIP = Symbol("skip");

const isNodeLike = (value: unknown): value is Node => {
  return Boolean(
    value &&
      typeof value === "object" &&
      // @ts-expect-error Looks like a node.
      typeof value.type === "string" &&
      // @ts-expect-error Looks like a node.
      value.type.length > 0
  );
};

export const visit = (node: Node, visitor: Visitor): void => {
  const result = visitor(node);
  if (result === SKIP) {
    return;
  }

  for (const key in node) {
    const typedKey = key as keyof Node;

    if (node[typedKey] && typeof node[typedKey] === "object" && key !== "parent") {
      const value = node[typedKey];

      if (Array.isArray(value)) {
        for (const element of value) {
          if (isNodeLike(element)) {
            const result = visitor(element);
            if (result === SKIP) {
              continue;
            }
            visit(element, visitor);
          }
        }
      } else {
        if (isNodeLike(value)) {
          const result = visitor(value);
          if (result === SKIP) {
            continue;
          }
          visit(value, visitor);
        }
      }
    }
  }
};

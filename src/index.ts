import { Rule } from "eslint";
import {
  ArrowFunctionExpression,
  CallExpression,
  FunctionExpression,
  Identifier,
  Literal,
  MemberExpression,
  Node,
  ObjectExpression,
  Property,
} from "estree";

import { SKIP, visit } from "./visit";

const isMemberExpression = (
  object: Node
): object is MemberExpression & {
  parent: Rule.Node;
} => {
  return object.type === "MemberExpression";
};

const isIdentifier = (expression: Node): expression is Identifier => {
  return expression.type === "Identifier";
};

const isLiteral = (expression: Node): expression is Literal => {
  return expression.type === "Literal";
};

const isArrowFunctionExpression = (expression: Node): expression is ArrowFunctionExpression => {
  return expression.type === "ArrowFunctionExpression";
};

const isObjectExpression = (expression: Node): expression is ObjectExpression => {
  return expression.type === "ObjectExpression";
};

const isFunctionExpression = (expression: Node): expression is FunctionExpression => {
  return expression.type === "FunctionExpression";
};

const isProperty = (expression: Node): expression is Property => {
  return expression.type === "Property";
};

const isTSType = (expression: { type: string }) => {
  return expression.type.startsWith("TSType");
};

const isReduceMethodAndShouldCheck = (
  node: CallExpression
): node is CallExpression & { arguments: [ArrowFunctionExpression, Node] } => {
  if (!isMemberExpression(node.callee)) {
    return false;
  }

  if (!isIdentifier(node.callee.property)) {
    return false;
  }

  if (node.callee.property.name !== "reduce") {
    return false;
  }

  const args = node.arguments;

  if (args.length !== 2) {
    return false;
  }

  if (!isArrowFunctionExpression(args[0]) && !isFunctionExpression(args[0])) {
    return false;
  }

  return true;
};

/**
 * Build name from MemberExpression such as following
 *
 * However, if a CallExpression is intercepted, discarded after that.
 *
 * e.g.
 * obj.prop => "obj.prop"
 * obj.prop[0].child => "ojb.prop.0.child"
 * obj.prop().child => "obj.prop"
 */
const buildNameFromMemberExpression = (node: MemberExpression, children: string[] = []): string | undefined => {
  const workChildren = children.slice();
  const { object, property } = node;

  if (isIdentifier(property)) {
    workChildren.push(property.name);
  }

  if (isLiteral(property)) {
    workChildren.unshift(property.value?.toString() ?? "__undefined__");
  }

  if (isIdentifier(object)) {
    return [object.name, ...workChildren].join(".");
  }

  if (isMemberExpression(object)) {
    return buildNameFromMemberExpression(object, workChildren);
  }

  let visitResult: string | undefined = undefined;
  visit(object, (node) => {
    if (isMemberExpression(node)) {
      visitResult = buildNameFromMemberExpression(node);
    }
  });

  return visitResult;
};

const getArgument = (node: Node): string[] => {
  const identifiers: string[] = [];

  visit(node, (node) => {
    // Skip under the TypeScript type
    if (isTSType(node)) {
      return SKIP;
    }

    // Skip the key in the object because it is not necessary to check it.
    if (isObjectExpression(node)) {
      identifiers.push(
        ...node.properties.flatMap((property) => (isProperty(property) ? getArgument(property.value) : []))
      );
      return SKIP;
    }

    // in the case of MemberExpression(e.g. object.property), check object and property as one group.
    if (isMemberExpression(node)) {
      const memberName = buildNameFromMemberExpression(node);
      if (!memberName) {
        return;
      }
      identifiers.push(memberName);
      return SKIP;
    }

    if (isIdentifier(node)) {
      identifiers.push(node.name);
      return SKIP;
    }
  });

  return identifiers;
};

const rule = {
  meta: {
    type: "problem",
    fixable: "code",
    hasSuggestions: true,
    docs: {
      description:
        "disallow to use the variable of the reduces's second argument in the function of the reduces's first argument",
      suggestion: true,
    },
    messages: {
      unexpectedUseSecondArgument:
        "Unexpected use the variable of the reduces's second argument in the function of the reduces's first argument",
    },
  },
  create(context: Rule.RuleContext) {
    return {
      CallExpression(node: CallExpression & Rule.NodeParentExtension) {
        if (!isReduceMethodAndShouldCheck(node)) {
          return;
        }

        const secondArgumentNames = getArgument(node.arguments[1]);

        const func = node.arguments[0];

        // If the name of the reduce's second argument is used for the argument of the function that the reduce's first argument, remove it.
        const functionArguments = func.params.flatMap(getArgument);
        const doNotUseIdentifiers = secondArgumentNames.filter((n) => !functionArguments.includes(n));

        const invalidIdentifierNodes: Node[] = [];

        visit(func.body, (node) => {
          if (isMemberExpression(node)) {
            const memberName = buildNameFromMemberExpression(node);

            if (!memberName) {
              return;
            }

            if (doNotUseIdentifiers.includes(memberName)) {
              invalidIdentifierNodes.push(node);
              return SKIP;
            }
          }
          if (isIdentifier(node)) {
            if (doNotUseIdentifiers.includes(node.name)) {
              invalidIdentifierNodes.push(node);
              return SKIP;
            }
          }
        });

        invalidIdentifierNodes.forEach((invalidNode) => {
          context.report({
            node: invalidNode,
            messageId: "unexpectedUseSecondArgument",
          });
        });
      },
    };
  },
} as Rule.RuleModule;

module.exports = rule;

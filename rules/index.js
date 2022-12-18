var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
import { SKIP, visit } from "./visit";
var isMemberExpression = function (object) {
    return object.type === "MemberExpression";
};
var isIdentifier = function (expression) {
    return expression.type === "Identifier";
};
var isLiteral = function (expression) {
    return expression.type === "Literal";
};
var isArrowFunctionExpression = function (expression) {
    return expression.type === "ArrowFunctionExpression";
};
var isObjectExpression = function (expression) {
    return expression.type === "ObjectExpression";
};
var isFunctionExpression = function (expression) {
    return expression.type === "FunctionExpression";
};
var isProperty = function (expression) {
    return expression.type === "Property";
};
var isTSType = function (expression) {
    return expression.type.startsWith("TSType");
};
var isReduceMethodAndShouldCheck = function (node) {
    if (!isMemberExpression(node.callee)) {
        return false;
    }
    if (!isIdentifier(node.callee.property)) {
        return false;
    }
    if (node.callee.property.name !== "reduce") {
        return false;
    }
    var args = node.arguments;
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
var buildNameFromMemberExpression = function (node, children) {
    var _a, _b;
    if (children === void 0) { children = []; }
    var workChildren = children.slice();
    var object = node.object, property = node.property;
    if (isIdentifier(property)) {
        workChildren.push(property.name);
    }
    if (isLiteral(property)) {
        workChildren.unshift((_b = (_a = property.value) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "__undefined__");
    }
    if (isIdentifier(object)) {
        return __spreadArray([object.name], workChildren, true).join(".");
    }
    if (isMemberExpression(object)) {
        return buildNameFromMemberExpression(object, workChildren);
    }
    var visitResult = undefined;
    visit(object, function (node) {
        if (isMemberExpression(node)) {
            visitResult = buildNameFromMemberExpression(node);
        }
    });
    return visitResult;
};
var getArgument = function (node) {
    var identifiers = [];
    visit(node, function (node) {
        // Skip under the TypeScript type
        if (isTSType(node)) {
            return SKIP;
        }
        // Skip the key in the object because it is not necessary to check it.
        if (isObjectExpression(node)) {
            identifiers.push.apply(identifiers, node.properties.flatMap(function (property) { return (isProperty(property) ? getArgument(property.value) : []); }));
            return SKIP;
        }
        // in the case of MemberExpression(e.g. object.property), check object and property as one group.
        if (isMemberExpression(node)) {
            var memberName = buildNameFromMemberExpression(node);
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
var rule = {
    meta: {
        type: "problem",
        fixable: "code",
        hasSuggestions: true,
        docs: {
            description: "disallow to use the variable of the reduces's second argument in the function of the reduces's first argument",
            suggestion: true,
        },
        messages: {
            unexpectedUseSecondArgument: "Unexpected use the variable of the reduces's second argument in the function of the reduces's first argument",
        },
    },
    create: function (context) {
        return {
            CallExpression: function (node) {
                if (!isReduceMethodAndShouldCheck(node)) {
                    return;
                }
                var secondArgumentNames = getArgument(node.arguments[1]);
                var func = node.arguments[0];
                // If the name of the reduce's second argument is used for the argument of the function that the reduce's first argument, remove it.
                var functionArguments = func.params.flatMap(getArgument);
                var doNotUseIdentifiers = secondArgumentNames.filter(function (n) { return !functionArguments.includes(n); });
                var invalidIdentifierNodes = [];
                visit(func.body, function (node) {
                    if (isMemberExpression(node)) {
                        var memberName = buildNameFromMemberExpression(node);
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
                invalidIdentifierNodes.forEach(function (invalidNode) {
                    context.report({
                        node: invalidNode,
                        messageId: "unexpectedUseSecondArgument",
                    });
                });
            },
        };
    },
};
module.exports = rule;

import { RuleTester } from "eslint";

const rule = require("../src/index.ts");

const ruleTester = new RuleTester();
ruleTester.run("no-invalid-reduce-variable", rule, {
  valid: [
    "arr.reduce(function(acc) { acc }, count)",
    "arr.reduce(function(acc) { return acc + 1 }, 1)",
    "arr.reduce(function(acc) { return { count: acc } }, { count: count1 })",
    "arr.reduce(function(count) { return count }, count)",
    "arr.reduce(function(count) { return obj }, obj.count)",
    "arr.reduce(function(count) { return count }, obj.count)",
    "arr.reduce(function(count) { return [] }, [])",
    "arr.reduce(function(count) { return {} }, {})",
  ],
  invalid: [
    {
      code: "arr.reduce(function(acc) { return count }, count)",
      errors: [
        {
          messageId: "unexpectedUseSecondArgument",
          type: "Identifier",
        },
      ],
    },
    {
      code: "arr.reduce(function(acc) { return [count1, count2] }, [count1, count2])",
      errors: [
        {
          messageId: "unexpectedUseSecondArgument",
          type: "Identifier",
        },
        {
          messageId: "unexpectedUseSecondArgument",
          type: "Identifier",
        },
      ],
    },
    {
      code: "arr.reduce(function(acc) { return { count: count1 } }, { count: count1 })",
      errors: [
        {
          messageId: "unexpectedUseSecondArgument",
          type: "Identifier",
        },
      ],
    },
    {
      code: "arr.reduce(function(acc) { return { count: obj.count } }, { count: obj })",
      errors: [
        {
          messageId: "unexpectedUseSecondArgument",
          type: "Identifier",
        },
      ],
    },
    {
      code: "arr.reduce(function(acc) { return { count: obj.count } }, { count: obj.count })",
      errors: [
        {
          messageId: "unexpectedUseSecondArgument",
          type: "MemberExpression",
        },
      ],
    },
  ],
});

/**
 * この値をvisitorが返した場合、それ以上子要素は確認しない
 */
export var SKIP = Symbol("skip");
var isNodeLike = function (value) {
    return Boolean(value &&
        typeof value === "object" &&
        // @ts-expect-error Looks like a node.
        typeof value.type === "string" &&
        // @ts-expect-error Looks like a node.
        value.type.length > 0);
};
export var visit = function (node, visitor) {
    var result = visitor(node);
    if (result === SKIP) {
        return;
    }
    for (var key in node) {
        var typedKey = key;
        if (node[typedKey] && typeof node[typedKey] === "object" && key !== "parent") {
            var value = node[typedKey];
            if (Array.isArray(value)) {
                for (var _i = 0, value_1 = value; _i < value_1.length; _i++) {
                    var element = value_1[_i];
                    if (isNodeLike(element)) {
                        var result_1 = visitor(element);
                        if (result_1 === SKIP) {
                            continue;
                        }
                        visit(element, visitor);
                    }
                }
            }
            else {
                if (isNodeLike(value)) {
                    var result_2 = visitor(value);
                    if (result_2 === SKIP) {
                        continue;
                    }
                    visit(value, visitor);
                }
            }
        }
    }
};

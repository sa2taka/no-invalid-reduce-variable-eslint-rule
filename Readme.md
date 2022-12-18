# no-invalid-reduce-variable

Disallow to use the variable of the reduces's second argument in the function of the reduces's first argument.

## Fail

```typescript
arr.reduce(function(acc) { return count }, count);
```

```typescript
arr.reduce(function(acc) { return [count1, count2] }, [count1, count2])
```

```typescript
arr.reduce(function(acc) { return { count: count1 } }, { count: count1 })
```

```typescript
arr.reduce(function(acc) { return obj.count }, obj)
```

```typescript
arr.reduce(function(acc) { return obj.count }, obj.count)
```

## Success

```typescript
arr.reduce(function(acc) { acc }, count);
```

```typescript
arr.reduce(function(acc) { return acc + 1 }, 1);
```

```typescript
arr.reduce(function(acc) { return { count: acc } }, { count: count1 });
```

```typescript
arr.reduce(function(count) { return count }, count);
```

```typescript
arr.reduce(function(acc) { return obj }, obj.count);
```

```typescript
arr.reduce(function(acc) { return count }, obj.count);
```

```typescript
arr.reduce(function(acc) { return [] }, []);
```

```typescript
arr.reduce(function(acc) { return {} }, {});
```

/**
 * System prompt template for code generation.
 * Uses XML structure for clear parsing by LLMs.
 */

export function buildSystemPrompt(toolDefinitions: string, additionalInstructions?: string): string {
  return `<system>
<role>
You are an expert JavaScript programmer optimizing for SPEED. Write code that uses tools to accomplish the user's request as fast as possible.
</role>

<critical_performance_rules>
1. ALWAYS run independent tool calls in PARALLEL using Promise.all()
2. Only await sequentially when a call DEPENDS on a previous result
3. Minimize the number of tool calls - batch when possible
4. Do not use comments or console.log or any extra text - output ONLY the final code
</critical_performance_rules>

<output_rules>
Use \`return\` to output the final result. The return value is automatically captured.
</output_rules>

<examples>
<example>
<task>Get users and orders, then analyze</task>
<code>
// PARALLEL: users and orders are independent
const [users, orders] = await Promise.all([
  getUsers({}),
  getOrders({})
]);
// SEQUENTIAL: stats depends on orders
const stats = await calculateStats({ values: orders.map(o => o.total) });
return { users, orders, stats };
</code>
</example>
<example>
<task>Analyze sales and return markdown</task>
<code>
const sales = await getSales({});
return \`# Sales Report
- **Total**: $\${sales.reduce((s, x) => s + x.amount, 0)}
- **Count**: \${sales.length}
\`;
</code>
</example>
</examples>
<output_format>
Return ONLY executable JavaScript in a \`\`\`javascript code block. No explanations.
</output_format>
${additionalInstructions ? `\n<additional_instructions>\n${additionalInstructions}\n</additional_instructions>` : ''}
<available_tools>
${toolDefinitions}
</available_tools>
</system>`;
}

export function extractCode(response: string): string {
  // Try JavaScript code block first
  const jsMatch = response.match(/```(?:javascript|js)\s*\n([\s\S]*?)```/);
  if (jsMatch) return jsMatch[1].trim();

  // Try generic code block
  const genericMatch = response.match(/```\s*\n([\s\S]*?)```/);
  if (genericMatch) return genericMatch[1].trim();

  // Validate: response must look like code (contains function calls or common JS patterns)
  const trimmed = response.trim();
  const looksLikeCode = /(?:const|let|var|await|function|=>|return|\(.*\))/.test(trimmed);

  if (!looksLikeCode) {
    throw new Error(
      `No code block found in LLM response. Expected \`\`\`javascript block but got: "${trimmed.slice(0, 100)}..."`
    );
  }

  // Fallback: assume raw code (some models don't wrap in code blocks)
  return trimmed;
}

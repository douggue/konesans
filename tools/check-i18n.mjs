#!/usr/bin/env node
/**
 * Find user-visible text in the kids' app that does not go through the translations
 * (useT()/tr() for UI text, useL() for content). Exit 1 when anything is found.
 *   node tools/check-i18n.mjs
 * Looks at apps/mobile/app/** and apps/mobile/src/** (.tsx):
 *  - JSX text children with letters
 *  - string / template literals given as a JSX child, or to a text-like prop
 *    (title, label, sub, text, placeholder, accessibilityLabel, hint, message)
 *  - string / template literals in object properties with those names
 * Allowlist: brand names, emoji, numbers, symbols, and lines marked `// i18n-ok`.
 */
import ts from 'typescript';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../', import.meta.url).pathname;
const DIRS = ['apps/mobile/app', 'apps/mobile/src'];
const TEXT_PROPS = new Set(['title', 'label', 'sub', 'text', 'placeholder', 'accessibilityLabel', 'hint', 'message', 'subtitle', 'caption']);
const ALLOW = [/^Konesans$/, /^Ti Zwazo$/, /^XP$/, /^VS$/, /^OK$/];
const TRANSLATORS = new Set(['t', 'tr', 'l', 'L', 'useT', 'useL']);

/** Natural language = has a run of 2+ letters (not just symbols, numbers, emoji). */
function isWords(s) {
  const v = s.replace(/\$\{[^}]*\}/g, ' ').trim();
  if (!v) return false;
  if (ALLOW.some((r) => r.test(v))) return false;
  // brand words / units that are the same in both languages, with only symbols around them ("+${n} XP")
  if (!/[A-Za-zÀ-ÿ]{2,}/.test(v.replace(/\b(Konesans|Ti Zwazo|XP|VS|OK)\b/g, ''))) return false;
  if (/^[a-z]+(_[a-z0-9]+)+$/.test(v) || /^(fr|ht|en|es)$/.test(v)) return false; // translation keys / language codes
  return /[A-Za-zÀ-ÿ]{2,}/.test(v);
}
function files(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) out.push(...files(p));
    else if (p.endsWith('.tsx')) out.push(p);
  }
  return out;
}
const insideTranslator = (node) => {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isCallExpression(p)) {
      const e = p.expression;
      const name = ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : '';
      if (TRANSLATORS.has(name)) return true;
    }
    if (ts.isJsxElement(p) || ts.isJsxSelfClosingElement(p) || ts.isFunctionLike(p) || ts.isBlock(p)) return false;
  }
  return false;
};
const literalText = (n) => (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) ? n.text : ts.isTemplateExpression(n) ? [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join(' ') : null);

const problems = [];
for (const dir of DIRS) for (const file of files(join(ROOT, dir))) {
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const report = (node, text) => {
    const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
    if (/i18n-ok/.test(lines[line] ?? '') || /i18n-ok/.test(lines[line - 1] ?? '')) return;
    problems.push(`${relative(ROOT, file)}:${line + 1}  ${JSON.stringify(text.trim().slice(0, 70))}`);
  };
  const visit = (node) => {
    if (ts.isJsxText(node) && isWords(node.text)) report(node, node.text);
    // literal as a JSX child: <T>{'text'}</T> or <T>{`a ${b}`}</T>
    if (ts.isJsxExpression(node) && node.expression && node.parent && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
      const lits = [];
      const collect = (e) => {
        const t = literalText(e);
        if (t != null) { lits.push([e, t]); return; }
        if (ts.isConditionalExpression(e)) { collect(e.whenTrue); collect(e.whenFalse); }
        else if (ts.isBinaryExpression(e) && (e.operatorToken.kind === ts.SyntaxKind.PlusToken || e.operatorToken.kind === ts.SyntaxKind.BarBarToken || e.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken || e.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)) { collect(e.left); collect(e.right); }
        else if (ts.isParenthesizedExpression(e)) collect(e.expression);
      };
      collect(node.expression);
      for (const [e, t] of lits) if (isWords(t) && !insideTranslator(e)) report(e, t);
    }
    // text-like props: title="…", label={`…`}
    if (ts.isJsxAttribute(node) && TEXT_PROPS.has(node.name.getText()) && node.initializer) {
      const init = node.initializer;
      const e = ts.isJsxExpression(init) ? init.expression : init;
      if (e) {
        const lits = [];
        const collect = (x) => { const t = literalText(x); if (t != null) lits.push([x, t]); else if (ts.isConditionalExpression(x)) { collect(x.whenTrue); collect(x.whenFalse); } else if (ts.isBinaryExpression(x)) { collect(x.left); collect(x.right); } else if (ts.isParenthesizedExpression(x)) collect(x.expression); };
        collect(e);
        for (const [x, t] of lits) if (isWords(t) && !insideTranslator(x)) report(x, t);
      }
    }
    // object properties: { label: 'Kalkil Mantal' }
    if (ts.isPropertyAssignment(node) && ts.isIdentifier(node.name) && TEXT_PROPS.has(node.name.text)) {
      const t = literalText(node.initializer);
      if (t != null && isWords(t) && !insideTranslator(node.initializer)) report(node.initializer, t);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}
if (problems.length) {
  console.log(problems.join('\n'));
  console.log(`\n${problems.length} untranslated text(s). Use t('key') with a [ht, fr] pair in src/lib/i18n.ts (or mark a deliberate exception with // i18n-ok).`);
  process.exit(1);
}
console.log('i18n: no untranslated text found');

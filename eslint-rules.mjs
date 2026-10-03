import nextPlugin from "@next/eslint-plugin-next";

const pageLinks = nextPlugin.rules["no-html-link-for-pages"];

// Next's App Router matcher also matches route handlers and the broad
// [section] routes. API responses need a document request, not RSC navigation.
// Preserve the upstream rule for every other destination and JSX construct.
const relayRules = {
  rules: {
    "no-html-link-for-pages": {
      ...pageLinks,
      create(context) {
        let originalNode;
        const filteredContext = Object.create(context, {
          report: {
            value(diagnostic) {
              context.report({...diagnostic, node: originalNode ?? diagnostic.node});
            },
          },
        });
        const listeners = pageLinks.create(filteredContext);
        return {
          ...listeners,
          JSXOpeningElement(node) {
            const href = node.attributes.find(attribute =>
              attribute.type === "JSXAttribute" && attribute.name.name === "href");
            const value = href?.value?.value;
            if (typeof value !== "string" || !value.startsWith("/api/")) {
              return listeners.JSXOpeningElement?.(node);
            }
            const url = new URL(value, "https://lint.invalid");
            if (url.pathname.startsWith("/api/")) return;
            // A traversal out of /api/ is an application destination. Feed its
            // canonical path to the upstream matcher, reporting the original JSX.
            const normalized = {
              ...node,
              attributes: node.attributes.map(attribute => attribute === href
                ? {...href, value: {...href.value, value: url.pathname + url.search + url.hash}}
                : attribute),
            };
            originalNode = node;
            try {
              return listeners.JSXOpeningElement?.(normalized);
            } finally {
              originalNode = undefined;
            }
          },
        };
      },
    },
  },
};

export default relayRules;

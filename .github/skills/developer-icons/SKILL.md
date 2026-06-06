---
name: developer-icons
description: Use when the user wants to display tech stack icons, programming language logos, framework icons, or any developer/tooling imagery in the frontend. Provides 319+ optimized SVG icons from the developer-icons package. Covers React, Next.js, Python, Docker, AWS, databases, CI/CD tools, and many more.
---

# Developer Icons Skill

Use the `developer-icons` npm package to render high-quality, customizable SVG tech logos in React components.

## Package Info

- **Package**: `developer-icons` (v7.0.1)
- **Import path**: `developer-icons/dist/icons/<IconName>`
- **Total icons**: 319+
- **License**: MIT
- **Repo**: https://github.com/xandemon/developer-icons

## Prerequisites

Before using, verify the package is installed:

```bash
cd frontend && npm list developer-icons
```

If not installed:

```bash
cd frontend && npm install developer-icons
```

## Import Pattern

Each icon is a named export from its own file. Import individually for optimal bundle size:

```tsx
import { React } from "developer-icons/dist/icons/React";
import { Python } from "developer-icons/dist/icons/Python";
import { Docker } from "developer-icons/dist/icons/Docker";
import { PostgreSQL } from "developer-icons/dist/icons/PostgreSQL";
```

## Icon Component API

All icons accept these props (extends `SVGProps<SVGElement>`):

```tsx
interface DeveloperIconProps {
  size?: number;        // Default: 24
  color?: string;       // Default: "currentColor"
  className?: string;
  strokeWidth?: number;
  // ...all standard SVG props
}
```

### Basic Usage

```tsx
import { React } from "developer-icons/dist/icons/React";

// Default (24px, currentColor)
<React />

// Custom size
<React size={32} />

// Custom color
<React color="#61DAFB" />

// With Tailwind classes
<React className="w-8 h-8 text-blue-500" />

// Combined
<React size={48} className="hover:scale-110 transition-transform" />
```

## Available Icon Categories

### Frontend Frameworks & Libraries
`React`, `Angular`, `Vue`, `Svelte`, `Solid`, `Astro`, `Next`, `Nuxt`, `Remix`, `Gatsby`, `Vite`, `Webpack`, `Rollup`, `ESLint`, `Prettier`, `Babel`, `TypeScript`, `JavaScript`, `HTML`, `CSS`, `TailwindCSS`, `Bootstrap`, `Sass`, `Less`, `StyledComponents`, `Framer`, `Redux`, `Zustand`, `Jest`, `Vitest`, `Cypress`, `Storybook`, `Radix`, `Shadcn`

### Backend & Runtime
`Node`, `Deno`, `Bun`, `Python`, `Java`, `Go`, `Rust`, `C`, `CPP`, `CSharp`, `Ruby`, `PHP`, `Elixir`, `Haskell`, `Scala`, `Kotlin`, `Swift`, `Dart`, `Flutter`, `Express`, `FastAPI`, `Django`, `Flask`, `Spring`, `Laravel`, `Rails`, `Nest`, `Next`

### Databases
`PostgreSQL`, `MySQL`, `MongoDB`, `Redis`, `SQLite`, `Supabase`, `Firebase`, `Prisma`, `Drizzle`, `PlanetScale`, `Neon`, `DynamoDB`, `Cassandra`, `CockroachDB`, `MariaDB`, `Oracle`, `MSSQL`

### Cloud & DevOps
`AWS`, `Azure`, `GCP`, `Cloudflare`, `Vercel`, `Netlify`, `Railway`, `Render`, `Heroku`, `DigitalOcean`, `Docker`, `Kubernetes`, `Terraform`, `Ansible`, `Pulumi`, `Nginx`, `Apache`, `Linux`, `Ubuntu`, `Debian`, `Arch`, `Fedora`, `Alpine`, `Git`, `GitHub`, `GitLab`, `Bitbucket`, `Jenkins`, `GitHubActions`, `CircleCI`, `TravisCI`

### AI & Data
`OpenAI`, `Anthropic`, `HuggingFace`, `LangChain`, `Pinecone`, `Chroma`, `Ollama`, `TensorFlow`, `PyTorch`, `Pandas`, `NumPy`, `Jupyter`, `Matplotlib`, `ScikitLearn`, `MLflow`, `WeightsBiases`, `HuggingFace`

### Tools & Editors
`VSCode`, `Vim`, `Neovim`, `IntelliJ`, `WebStorm`, `PyCharm`, `Figma`, `Notion`, `Slack`, `Discord`, `Linear`, `Jira`, `Confluence`, `Postman`, `Insomnia`, `Chrome`, `Firefox`, `Safari`, `Arc`, `Warp`, `iTerm`, `Obsidian`, `Raycast`

### Communication & Social
`Twitter`, `X`, `LinkedIn`, `YouTube`, `Twitch`, `Reddit`, `StackOverflow`, `DevTo`, `Hashnode`, `Medium`, `Substack`

### Other
`Apple`, `Windows`, `Android`, `IOS`, `Wasm`, `WebGPU`, `ThreeJS`, `WebGL`, `SocketIO`, `GraphQL`, `REST`, `tRPC`, `gRPC`, `OAuth`, `JWT`, `Markdown`, `LaTeX`, `Regex`

## Finding Icons

To see all available icons, check:

```bash
ls node_modules/developer-icons/dist/icons/ | sed 's/\.d\.ts$//'
```

Or browse at: https://xandemon.github.io/developer-icons/icons/All

## Icon Variants

Some icons have multiple variants. Common suffixes:

- `Dark` / `Light` — color variants (e.g., `AppleDark`, `AppleLight`)
- `Wordmark` — text-only logo (e.g., `ReactWordmark`)
- `Basic` — simplified version (e.g., `AnthropicBasicDark`)

Example:

```tsx
import { AppleDark } from "developer-icons/dist/icons/AppleDark";
import { AnthropicBasicDark } from "developer-icons/dist/icons/AnthropicBasicDark";
```

## Best Practices

1. **Always use named imports** — never `import * from "developer-icons"` (imports all 319 icons)
2. **Use `currentColor`** for the `color` prop so icons inherit text color from CSS/Tailwind
3. **Set explicit `size`** for consistent rendering across the UI
4. **Use `className`** for Tailwind styling (w-*, h-*, text-*, hover:*, etc.)
5. **Lazy load** icon-heavy components if needed
6. **Group related icons** in a shared component file (e.g., `components/icons/TechStack.tsx`)

## Example: Tech Stack Grid

```tsx
import { React } from "developer-icons/dist/icons/React";
import { TypeScript } from "developer-icons/dist/icons/TypeScript";
import { TailwindCSS } from "developer-icons/dist/icons/TailwindCSS";
import { Vite } from "developer-icons/dist/icons/Vite";

function TechStack() {
  const stack = [
    { Icon: React, label: "React" },
    { Icon: TypeScript, label: "TypeScript" },
    { Icon: TailwindCSS, label: "Tailwind CSS" },
    { Icon: Vite, label: "Vite" },
  ];

  return (
    <div className="flex gap-4">
      {stack.map(({ Icon, label }) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <Icon size={32} className="text-gray-700" />
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      ))}
    </div>
  );
}
```

## Example: Icon with Tooltip

```tsx
import { Docker } from "developer-icons/dist/icons/Docker";

function DockerBadge() {
  return (
    <div className="group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-md border-2 border-black bg-white shadow-[3px_3px_0px_#1A1A1A] hover:shadow-[4px_4px_0px_#1A1A1A] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all">
      <Docker size={18} className="text-blue-600" />
      <span className="text-sm font-semibold">Docker</span>
    </div>
  );
}
```

## Integration with This Project

This project uses the Notion-Ink neo-brutalist design system. When adding icons:

- Use `size={20-24}` for inline icons alongside text
- Use `size={32-48}` for feature cards or tech stack displays
- Use `color="currentColor"` to inherit the app's text color palette
- Match the app's border style: `border-2 border-[#1A1A1A] shadow-[3px_3px_0px_#1A1A1A]`
- Add hover effects: `hover:-translate-y-[1px] hover:shadow-[4px_4px_0px_#1A1A1A]`
- Use the app's spacing scale: `--space-sm` (0.5rem), `--space-md` (1rem), etc.

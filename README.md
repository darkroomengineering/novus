# Welcome to React Router!

A modern, production-ready template for building full-stack React applications using React Router.

[![Open in StackBlitz](https://developer.stackblitz.com/img/open_in_stackblitz.svg)](https://stackblitz.com/github/remix-run/react-router-templates/tree/main/default)

## Features

- 🚀 Server-side rendering
- ⚡️ Hot Module Replacement (HMR)
- 📦 Asset bundling and optimization
- 🔄 Data loading and mutations
- 🔒 TypeScript by default
- 🎉 TailwindCSS for styling
- 📖 [React Router docs](https://reactrouter.com/)

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

## Sanity CMS Integration

This project includes Sanity CMS integration with Visual Editing capabilities.

### Setup

1. Copy the environment variables template:
   ```bash
   cp env.example .env
   ```

2. Update the `.env` file with your Sanity project details:
   ```
   PUBLIC_SANITY_PROJECT_ID="your-project-id"
   PUBLIC_SANITY_DATASET="production"
   PUBLIC_SANITY_STUDIO_URL="https://your-project.sanity.studio"
   SANITY_VIEWER_TOKEN="your-viewer-token"
   ```

### Visual Editing

The project includes Sanity's Visual Editing feature that allows content editors to:
- Preview content changes in real-time
- Edit content directly from the frontend
- Navigate between Sanity Studio and your application seamlessly

### Usage

- **Enable Preview Mode**: Navigate to `/api/preview-mode/enable`
- **Disable Preview Mode**: Click the "Disable Preview Mode" button or navigate to `/api/preview-mode/disable`

### Data Fetching

#### Basic Data Fetching

Use the utility functions in `sanity/utils.ts` for basic data fetching:

```typescript
import { fetchQuery } from "~/sanity/utils";

// In a loader function
export async function loader({ request }: LoaderArgs) {
  const { options } = await previewContext(request.headers);
  
  const data = await fetchQuery(
    `*[_type == "post"]`,
    options
  );
  
  return { data };
}
```

#### Instant Updates with React Loader

For instant updates and perspective switching, use `loadQuery` and `useQuery`:

```typescript
import { useQuery } from "@sanity/react-loader";
import { loadQuery } from "~/sanity/loader";

// In a loader function
export async function loader({ request }: LoaderArgs) {
  const { options } = await previewContext(request.headers);
  const data = await loadQuery(query, {}, options);
  return data;
}

// In a component
export default function MyComponent({ loaderData }: Route.ComponentProps) {
  const { data, encodeDataAttribute } = useQuery(
    query,
    {},
    { initial: loaderData }
  );

  return (
    <h1 data-sanity={encodeDataAttribute(["title"])}>
      {data.title}
    </h1>
  );
}
```

### Overlays and Data Attributes

The setup includes support for manual data attributes using `encodeDataAttribute`:

```typescript
// For simple fields
<div data-sanity={encodeDataAttribute(["title"])}>
  {data.title}
</div>

// For array items
<div data-sanity={encodeDataAttribute([
  "contentBlocks",
  { _key: block._key }
])}>
  {block.content}
</div>

// For nested fields
<div data-sanity={encodeDataAttribute([
  "contentBlocks",
  { _key: block._key },
  "title"
])}>
  {block.title}
</div>
```

---

Built with ❤️ using React Router.

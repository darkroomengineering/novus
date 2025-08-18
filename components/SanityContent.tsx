import { useQuery } from "@sanity/react-loader";

type ContentBlock = {
  _key: string;
  _type: string;
  title?: string;
  content?: string;
  image?: {
    asset: {
      _ref: string;
    };
    alt?: string;
  };
};

type SanityContentProps = {
  documentId: string;
  documentType: string;
  query: string;
  initialData: any;
};

export function SanityContent({ 
  documentId, 
  documentType, 
  query, 
  initialData 
}: SanityContentProps) {
  const { data, encodeDataAttribute } = useQuery(
    query,
    { id: documentId },
    { initial: initialData }
  );

  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Document title with overlay */}
      {data.title && (
        <h1 
          className="text-4xl font-bold mb-6"
          data-sanity={encodeDataAttribute(["title"])}
        >
          {data.title}
        </h1>
      )}

      {/* Description with overlay */}
      {data.description && (
        <p 
          className="text-xl text-gray-600 mb-8"
          data-sanity={encodeDataAttribute(["description"])}
        >
          {data.description}
        </p>
      )}

      {/* Content blocks with overlays */}
      {data.contentBlocks && (
        <div data-sanity={encodeDataAttribute(["contentBlocks"])}>
          {data.contentBlocks.map((block: ContentBlock) => (
            <div
              key={block._key}
              className="mb-8 p-6 border rounded-lg"
              data-sanity={encodeDataAttribute([
                "contentBlocks",
                { _key: block._key }
              ])}
            >
              {block.title && (
                <h3 
                  className="text-2xl font-semibold mb-3"
                  data-sanity={encodeDataAttribute([
                    "contentBlocks",
                    { _key: block._key },
                    "title"
                  ])}
                >
                  {block.title}
                </h3>
              )}

              {block.content && (
                <div
                  className="prose max-w-none"
                  data-sanity={encodeDataAttribute([
                    "contentBlocks",
                    { _key: block._key },
                    "content"
                  ])}
                >
                  {block.content}
                </div>
              )}

              {block.image && (
                <div
                  className="mt-4"
                  data-sanity={encodeDataAttribute([
                    "contentBlocks",
                    { _key: block._key },
                    "image"
                  ])}
                >
                  <img
                    src={`https://cdn.sanity.io/images/${process.env.PUBLIC_SANITY_PROJECT_ID}/${process.env.PUBLIC_SANITY_DATASET}/${block.image.asset._ref.replace('image-', '').replace('-jpg', '.jpg').replace('-png', '.png').replace('-webp', '.webp')}`}
                    alt={block.image.alt || ""}
                    className="w-full h-auto rounded-lg"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

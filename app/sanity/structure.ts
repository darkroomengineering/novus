import type {
  StructureResolver,
} from 'sanity/structure'

export const structure: StructureResolver = (S) =>
  S.list()
    .id('root')
    .title('Content')
    .items([
      // Singleton, home page curation
      S.listItem()
        .id('home')
        .schemaType('home')
        .title('Home')
        .child(S.editor().id('home').schemaType('home').documentId('home')),
      // S.divider(),
      // Document lists
      // S.documentTypeListItem('record').title('Records').icon(Disc),
      // S.documentTypeListItem('artist').title('Artists').icon(Users),
      // S.divider(),
      // S.documentTypeListItem('genre').title('Genres').icon(Tags),
    ])

// export const defaultDocumentNode: DefaultDocumentNodeResolver = (
//   S,
//   {schemaType, documentId},
// ) => {
//   const OGPreviewView = S.view
//     .component(OGPreview)
//     .options({
//       url: resolveOGUrl(documentId),
//     })
//     .title('OG Preview')

//   switch (schemaType) {
//     case `home`:
//       return S.document().views([S.view.form()])
//     case `record`:
//       return S.document().views([S.view.form(), OGPreviewView])
//     default:
//       return S.document().views([S.view.form()])
//   }
// }
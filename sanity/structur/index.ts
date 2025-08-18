import type {
  DefaultDocumentNodeResolver,
  StructureResolver,
} from 'sanity/structure'
import { HouseSimpleIcon } from "@phosphor-icons/react"

export const structure: StructureResolver = (S) =>
  S.list()
    .id('root')
    .title('Content')
    .items([
      // Singleton, home page curation
      S.listItem()
        .icon(HouseSimpleIcon)
        .id('home')
        .schemaType('home')
        .title('Home')
        .child(S.editor().id('home').schemaType('home').documentId('home')),
      S.divider(),
      // Document lists
      // S.documentTypeListItem('record').title('Records'),
      // S.documentTypeListItem('artist').title('Artists'),
      // S.divider(),
      // S.documentTypeListItem('genre').title('Genres'),
    ])

export const defaultDocumentNode: DefaultDocumentNodeResolver = (
  S,
  {schemaType},
) => {

  switch (schemaType) {
    case `home`:
      return S.document().views([S.view.form()])
    case `record`:
      return S.document().views([S.view.form()])
    default:
      return S.document().views([S.view.form()])
  }
}
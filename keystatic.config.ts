import { config, collection, fields } from '@keystatic/core';

export default config({
  storage: {
    kind: 'github',
    repo: { owner: 'bradthomasdesign', name: 'QCMMNew' },
  },

  ui: {
    brand: { name: 'QCMM — CMS' },
  },

  collections: {
    blog: collection({
      label: 'QCMM News',
      slugField: 'title',
      path: 'src/content/blog/en/*',
      format: { contentField: 'body' },
      entryLayout: 'content',
      schema: {
        title: fields.slug({
          name: { label: 'Title', validation: { isRequired: true } },
        }),
        description: fields.text({
          label: 'Description',
          multiline: true,
          validation: { isRequired: true, length: { max: 200 } },
        }),
        publishedAt: fields.date({
          label: 'Published Date',
          validation: { isRequired: true },
        }),
        updatedAt: fields.date({ label: 'Updated Date' }),
        author: fields.text({ label: 'Author', defaultValue: 'QCMM Team' }),
        image: fields.image({
          label: 'Cover Image',
          directory: 'src/assets/blog',
          publicPath: '../../../assets/blog/',
        }),
        imageAlt: fields.text({ label: 'Image Alt Text' }),
        tags: fields.array(fields.text({ label: 'Tag' }), {
          label: 'Tags',
          itemLabel: (props) => props.value || 'Tag',
        }),
        featured: fields.checkbox({ label: 'Featured', defaultValue: false }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        body: fields.mdx({ label: 'Body' }),
      },
    }),

    characters: collection({
      label: 'Characters',
      slugField: 'name',
      path: 'src/content/characters/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({
          name: { label: 'Name', validation: { isRequired: true } },
        }),
        bio: fields.text({
          label: 'Bio',
          multiline: true,
          validation: { isRequired: true },
        }),
        avatar: fields.image({
          label: 'Avatar',
          directory: 'src/assets/characters',
          publicPath: '../../../assets/characters/',
        }),
        group: fields.select({
          label: 'Group',
          options: [
            { label: 'Professors', value: 'professors' },
            { label: 'Students', value: 'students' },
            { label: 'Ozland', value: 'ozland' },
            { label: 'Favorite Supporting', value: 'favorite-supporting' },
            { label: 'Supporting', value: 'supporting' },
            { label: 'Beauxbatons', value: 'beauxbatons' },
            { label: 'Baddies', value: 'baddies' },
            { label: 'Founders', value: 'founders' },
          ],
          defaultValue: 'supporting',
        }),
        active: fields.checkbox({ label: 'Active', defaultValue: true }),
      },
    }),

    locations: collection({
      label: 'Locations',
      slugField: 'name',
      path: 'src/content/locations/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({
          name: { label: 'Name', validation: { isRequired: true } },
        }),
        description: fields.text({ label: 'Description', multiline: true }),
        latitude: fields.number({ label: 'Latitude', validation: { isRequired: true } }),
        longitude: fields.number({ label: 'Longitude', validation: { isRequired: true } }),
        is_active: fields.checkbox({ label: 'Active', defaultValue: true }),
        is_secret: fields.checkbox({ label: 'Secret Location', defaultValue: false }),
        difficulty_level: fields.number({ label: 'Difficulty Level (1–5)' }),
        featured_image_url: fields.text({ label: 'Featured Image URL' }),
        reward_description: fields.text({ label: 'Reward Description', multiline: true }),
        character_slugs: fields.array(fields.text({ label: 'Character Slug' }), {
          label: 'Characters',
          itemLabel: (props) => props.value || 'Character',
        }),
        collection_slugs: fields.array(fields.text({ label: 'Collection Slug' }), {
          label: 'Collections',
          itemLabel: (props) => props.value || 'Collection',
        }),
      },
    }),

    locationCollections: collection({
      label: 'Collections',
      slugField: 'name',
      path: 'src/content/collections/*',
      format: { data: 'json' },
      schema: {
        name: fields.slug({
          name: { label: 'Name', validation: { isRequired: true } },
        }),
        description: fields.text({
          label: 'Description',
          multiline: true,
          validation: { isRequired: true },
        }),
        badgeImage: fields.image({
          label: 'Badge Image',
          directory: 'src/assets/collections',
          publicPath: '../../../assets/collections/',
        }),
        active: fields.checkbox({ label: 'Active', defaultValue: true }),
      },
    }),
  },
});

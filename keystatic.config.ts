import { config, collection, fields } from '@keystatic/core';

export default config({
  storage: {
    // Use 'local' for development. Switch to 'github' for production
    // once a QCMM-specific GitHub OAuth app is created.
    kind: 'local',
    // Production config (requires KEYSTATIC_GITHUB_CLIENT_ID etc. in .env):
    // kind: 'github',
    // repo: { owner: 'bradthomasdesign', name: 'markur-pin-quest' },
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
          itemLabel: (props) => props.fields.value.value || 'Tag',
        }),
        featured: fields.checkbox({ label: 'Featured', defaultValue: false }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        body: fields.mdx({ label: 'Body' }),
      },
    }),
  },
});

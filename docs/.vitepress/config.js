export default {
    title: 'My Lib',
    themeConfig: {
        nav: [{ text: 'Guide', link: '/guide' }],
        sidebar: [
            {
                text: 'Introduction',
                items: [
                    { text: 'Getting Started', link: '/guide' },
                    { text: 'API Reference', link: '/api' }
                ]
            }
        ]
    }
}

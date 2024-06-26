exports.routes = {
   name: 'URL Shortener',
   category: 'tools',
   path: '/api/shorten',
   parameter: ['url'],
   example: {
      url: 'https://github.com/neoxr/webapi'
   },
   method: 'get',
   execution: async (req, res, next) => {
      const _ = exports.routes.utils
      const json = await _.Scraper.shorten(req.query.url)
      console.log(_.Scraper)
      res.json(json)
   },
   error: false
}
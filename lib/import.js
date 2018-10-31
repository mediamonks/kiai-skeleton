const datastore = require('./datastore');

module.exports = (req, res) => {
  const { entity, key, data = [] } = req.body;

  Promise.all(
    data.map(async item => {
      const _key = item[key];
      return datastore.upsert(entity, { [key]: _key }, item);
    }),
  )
    .then(() => {
      res.send('OK');
    })
    .catch(err => {
      if (typeof err === 'object') err = err.toString();
      res.status(500).send(err);
    });
};

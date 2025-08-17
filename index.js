require('dotenv').config();

const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const OBJECT_TYPE = process.env.HUBSPOT_OBJECT_TYPE || '2-XXXXXXX'; 

const PROPS = (process.env.COBJ_PROPERTIES || 'name,bio,favorite_color')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean);

const hubspot = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    Authorization: `Bearer ${HUBSPOT_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

// ====== Middleware ======
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));


app.get('/', async (req, res) => {
  try {
    const resp = await hubspot.get(
      `/crm/v3/objects/${encodeURIComponent(OBJECT_TYPE)}`,
      {
        params: {
          properties: PROPS.join(','),
          archived: false,
          limit: 100
        }
      }
    );

    const rows = (resp.data.results || []).map(r => ({
      id: r.id,
      properties: r.properties || {}
    }));

    res.render('homepage', {
      title: 'Custom Object List | IWH-I Practicum',
      props: PROPS,
      rows
    });
  } catch (err) {
    console.error('GET / error:', err?.response?.data || err.message);
    res.status(500).send(`<pre>Cannot fetch objects:\n${JSON.stringify(err?.response?.data || err.message, null, 2)}</pre>`);
  }
});

app.get('/update-cobj', (req, res) => {
  res.render('updates', {
    title: 'Оновити форму користувацького об’єкта | Інтеграція з HubSpot I, практика',
    props: PROPS
  });
});

app.post('/update-cobj', async (req, res) => {
  try {
    const properties = {};
    for (const key of PROPS) {
      if (req.body[key] != null && req.body[key] !== '') {
        properties[key] = req.body[key];
      }
    }

    if (!properties.name) {
      return res.status(400).send('Поле "name" є обов’язковим.');
    }

    await hubspot.post(`/crm/v3/objects/${encodeURIComponent(OBJECT_TYPE)}`, {
      properties
    });

    res.redirect('/');
  } catch (err) {
    console.error('POST /update-cobj error:', err?.response?.data || err.message);
    res.status(500).send(`<pre>Cannot create object:\n${JSON.stringify(err?.response?.data || err.message, null, 2)}</pre>`);
  }
});

app.listen(PORT, () => {
  console.log(`✅ App running on http://localhost:${PORT}`);
});

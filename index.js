require("dotenv").config();

const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const HUBSPOT_TOKEN = process.env.HUBSPOT_PRIVATE_APP_TOKEN;
const OBJECT_TYPE = process.env.HUBSPOT_OBJECT_TYPE;

const PROPS = (process.env.COBJ_PROPERTIES || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const REQUIRED_PROPS = (process.env.REQUIRED_PROPS || "dog_name")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const hubspot = axios.create({
  baseURL: "https://api.hubapi.com",
  headers: {
    Authorization: `Bearer ${HUBSPOT_TOKEN}`,
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// ====== Middleware ======
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "pug");
app.set("views", path.join(__dirname, "views"));

// ====== List (homepage) ======
app.get("/", async (req, res) => {
  try {
    const resp = await hubspot.get(
      `/crm/v3/objects/${encodeURIComponent(OBJECT_TYPE)}`,
      { params: { properties: PROPS.join(","), archived: false, limit: 100 } }
    );

    const rows = (resp.data.results || []).map((r) => ({
      id: r.id,
      properties: r.properties || {},
    }));

    res.render("homepage", {
      title: "Custom Object List | IWH-I Practicum",
      props: PROPS,
      rows,
    });
  } catch (err) {
    console.error("GET / error:", err?.response?.data || err.message);
    res
      .status(500)
      .send(
        `<pre>Cannot fetch objects:\n${JSON.stringify(
          err?.response?.data || err.message,
          null,
          2
        )}</pre>`
      );
  }
});

// ====== Form ======
app.get("/update-cobj", (req, res) => {
  const newLocal =
    "Update custom object form | HubSpot I Integration, practicum";
  res.render("updates", {
    title: newLocal,
    props: PROPS,
  });
});

// ====== Create ======
app.post("/update-cobj", async (req, res) => {
  try {
    const properties = {};
    for (const prop of PROPS) {
      if (req.body[prop] != null && req.body[prop] !== "") {
        properties[prop] = req.body[prop];
      }
    }

    const missing = REQUIRED_PROPS.filter((p) => !properties[p]);
    if (missing.length) {
      return res
        .status(400)
        .send(`Missing required fields: ${missing.join(", ")}`);
    }

    await hubspot.post(`/crm/v3/objects/${encodeURIComponent(OBJECT_TYPE)}`, {
      properties,
    });

    res.redirect("/");
  } catch (err) {
    console.error(
      "POST /update-cobj error:",
      err?.response?.data || err.message
    );
    res
      .status(500)
      .send(
        `<pre>Cannot create object:\n${JSON.stringify(
          err?.response?.data || err.message,
          null,
          2
        )}</pre>`
      );
  }
});

app.listen(PORT, () => {
  console.log(`✅ App running on http://localhost:${PORT}`);
});

# SuperAppKu Demo 🛵

A separate **demonstration-only** Flask application with no Supabase, login, or database. Includes Customer, Driver, Seller, food ordering, motorcycle rides, a simulated tracking map, and Spotify Embed.

## Run locally

```bash
python -m pip install -r requirements.txt
python app.py
```

Open http://127.0.0.1:5000

## Deploy on Vercel

1. Upload this folder to a **new** GitHub repository (never upload `.env`).
2. In Vercel, choose **New Project** → import the new repository.
3. Select **Flask** framework if prompted. Set Root Directory to the directory containing `app.py` and `requirements.txt`.
4. No environment variables are needed. Click **Deploy**.

Flask's `app` object in `app.py` is the Vercel Python entry point. There is no need for `vercel.json` for standard Flask autodetection.

## Demo instructions

1. Open **Customer** → order a ride or add food to the cart and checkout.
2. Open **Penjual** → mark a food order as prepared.
3. Open **Driver** → accept an order, start trip, finish trip.
4. Open **Lacak** → see simulated driver movement on the Leaflet map.
5. Try the Spotify player (playback restrictions depend on Spotify/browser/account).

### Important limitations

- All orders live in **this browser's localStorage**. They are not shared across browsers or devices, even on Vercel. The Reset Demo button clears local demo data.
- Driver GPS and routing are **simulations**, not actual GPS or turn-by-turn navigation.
- OpenStreetMap tiles, Leaflet, fonts and Spotify Embed require internet connectivity.
- This is a classroom demonstration, **not** a real booking, payment or dispatch system.
- Vercel Hobby is intended for personal/noncommercial use; review plan terms before commercial deployment.

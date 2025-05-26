import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import path from 'path';
import CryptoJS from 'crypto-js';
import { fileURLToPath } from 'url';

const clave = "ac1244b5-8bee-47b2-a4a5-924a748d907f";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // Sirve index.html y JS desde raíz


// Ruta API para consultar detalles RUES
app.get('/api/detalle/:id', async (req, res) => {
  const nit = req.params.id;
  try {
    const dataBody = CryptoJS.AES.encrypt(JSON.stringify({ nit }), clave).toString();

    // Primera consulta: obtener ID de matrícula
    const response1 = await fetch('https://elasticprd.rues.org.co/api/ConsultasRUES/BusquedaAvanzadaRM', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataBody })
    });

    const data1 = await response1.json();
    console.log(data1.registros.length)

    if (!data1 || !data1.registros || data1.registros.length === 0) {
      return res.status(404).json({ error: 'NIT no encontrado en RUES' });
    }
    let id_rm = ''
    if (data1.registros.length <= 1) {
      id_rm = data1.registros[0].id_rm;
    } else {
      for (let index = 0; index < data1.registros.length; index++) {
        
        if (data1.registros[index].estado_matricula == 'ACTIVA') {
          id_rm = data1.registros[index].id_rm;
          break
        } else {
          id_rm = data1.registros[index].id_rm;
        }
      }
      
    }

    

    // Segunda consulta: obtener detalle con ID de matrícula
    const response2 = await fetch(`https://ruesapi.rues.org.co/WEB2/api/Expediente/DetalleRM/${id_rm}`);
    const data2 = await response2.json();

    res.json(data2);
  } catch (error) {
    console.error('❌ Error en API:', error);
    res.status(500).json({ error: 'Error al consultar la API RUES' });
  }
});

app.post('/consulta', async (req, res) => {
  try {
    const { nit } = req.body;

    if (!nit) {
      return res.status(400).json({ error: 'Debe enviar un NIT' });
    }

    const input = { nit };
    const dataBody = CryptoJS.AES.encrypt(JSON.stringify(input), clave).toString();

    const response = await fetch('https://elasticprd.rues.org.co/api/ConsultasRUES/BusquedaAvanzadaRM', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataBody })
    });
    console.log(response)
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Error en la API RUES', status: response.status });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error interno', message: error.message });
  }
});


app.get('/detalles/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const apiUrl = `https://ruesapi.rues.org.co/WEB2/api/Expediente/DetalleRM/${id}`;
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Error al consultar API RUES: ${response.status}`);
    }
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error en /detalles/:id:', error.message);
    res.status(500).json({ error: 'No se pudo obtener el detalle del registro.' });
  }
})
app.listen(PORT, () => {
  console.log(`✅ Servidor backend corriendo en http://localhost:${PORT}`);
});

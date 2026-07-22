# Simulador Financiero Airbnb Ecuador

Calculadora de tarifas y proyeccion de utilidades para anfitriones de Airbnb en Ecuador.

## Como usarlo

1. Abre `index.html` haciendo doble clic (usa **Google Chrome** o **Microsoft Edge** — otros
   navegadores no pueden guardar el archivo de datos).
2. La primera vez, elige "Crear nuevo simulador.db" y guarda el archivo en la carpeta que quieras
   (recomendado: la misma carpeta de este proyecto).
3. Completa los 3 pasos del formulario. Todo se guarda automaticamente en ese archivo `.db` mientras
   escribes — no hay boton "Guardar".
4. La proxima vez que abras `index.html`, tus datos se cargan solos desde el mismo archivo.

## Desarrollo

Los calculos financieros tienen pruebas automatizadas (no requeridas para usar la app):

```bash
npm test
```

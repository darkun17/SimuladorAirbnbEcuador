// js/locations.js
// Provincias y cantones oficiales de Ecuador (24 provincias, 222 cantones).
(function (root) {
  const PROVINCIAS_ECUADOR = [
    { provincia: 'Azuay', cantones: ['Camilo Ponce Enríquez', 'Chordeleg', 'Cuenca', 'El Pan', 'Girón', 'Guachapala', 'Gualaceo', 'Nabón', 'Oña', 'Paute', 'Pucará', 'San Fernando', 'Santa Isabel', 'Sevilla de Oro', 'Sígsig'] },
    { provincia: 'Bolívar', cantones: ['Guaranda', 'Las Naves', 'Echeandía', 'Caluma', 'Chimbo', 'San Miguel', 'Chillanes'] },
    { provincia: 'Cañar', cantones: ['Azogues', 'Biblián', 'Cañar', 'Déleg', 'El Tambo', 'La Troncal', 'Suscal'] },
    { provincia: 'Carchi', cantones: ['Tulcán', 'Mira', 'Espejo', 'Montúfar', 'San Pedro de Huaca', 'Bolívar'] },
    { provincia: 'Chimborazo', cantones: ['Guano', 'Penipe', 'Riobamba', 'Colta', 'Chambo', 'Pallatanga', 'Guamote', 'Alausí', 'Cumandá', 'Chunchi'] },
    { provincia: 'Cotopaxi', cantones: ['Sigchos', 'La Maná', 'Latacunga', 'Saquisilí', 'Pujilí', 'Pangua', 'Salcedo'] },
    { provincia: 'El Oro', cantones: ['Arenillas', 'Atahualpa', 'Balsas', 'Chilla', 'El Guabo', 'Huaquillas', 'Las Lajas', 'Machala', 'Marcabelí', 'Pasaje', 'Piñas', 'Portovelo', 'Santa Rosa', 'Zaruma'] },
    { provincia: 'Esmeraldas', cantones: ['San Lorenzo', 'Eloy Alfaro', 'Rioverde', 'Esmeraldas', 'Muisne', 'Atacames', 'Quinindé'] },
    { provincia: 'Galápagos', cantones: ['San Cristóbal', 'Isabela', 'Santa Cruz'] },
    { provincia: 'Guayas', cantones: ['Guayaquil', 'Alfredo Baquerizo Moreno', 'Balao', 'Balzar', 'Colimes', 'Daule', 'Durán', 'El Empalme', 'El Triunfo', 'Antonio Elizalde (Bucay)', 'Isidro Ayora', 'Lomas de Sargentillo', 'Marcelino Maridueña', 'Milagro', 'Naranjal', 'Naranjito', 'Nobol', 'Palestina', 'Pedro Carbo', 'Playas', 'Salitre', 'Samborondón', 'Santa Lucía', 'Simón Bolívar', 'Yaguachi'] },
    { provincia: 'Imbabura', cantones: ['Ibarra', 'San Miguel de Urcuquí', 'Cotacachi', 'Antonio Ante', 'Otavalo', 'Pimampiro'] },
    { provincia: 'Loja', cantones: ['Loja', 'Calvas', 'Catamayo', 'Celica', 'Chaguarpamba', 'Espíndola', 'Gonzanamá', 'Macará', 'Olmedo', 'Paltas', 'Pindal', 'Puyango', 'Quilanga', 'Saraguro', 'Sozoranga', 'Zapotillo'] },
    { provincia: 'Los Ríos', cantones: ['Babahoyo', 'Baba', 'Buena Fe', 'Mocache', 'Montalvo', 'Palenque', 'Puebloviejo', 'Quevedo', 'Quinsaloma', 'Urdaneta', 'Valencia', 'Ventanas', 'Vinces'] },
    { provincia: 'Manabí', cantones: ['Portoviejo', 'Bolívar', 'Chone', 'El Carmen', 'Flavio Alfaro', 'Jama', 'Jaramijó', 'Jipijapa', 'Junín', 'Manta', 'Montecristi', 'Olmedo', 'Paján', 'Pedernales', 'Pichincha', 'Puerto López', 'Rocafuerte', 'San Vicente', 'Santa Ana', 'Sucre', 'Tosagua', 'Veinticuatro de Mayo'] },
    { provincia: 'Morona Santiago', cantones: ['Morona', 'Gualaquiza', 'Huamboya', 'Limón Indanza', 'Logroño', 'Pablo Sexto', 'Palora', 'San Juan Bosco', 'Santiago', 'Sevilla Don Bosco', 'Sucúa', 'Taisha', 'Tiwintza'] },
    { provincia: 'Napo', cantones: ['Tena', 'Archidona', 'Carlos Julio Arosemena Tola', 'El Chaco', 'Quijos'] },
    { provincia: 'Orellana', cantones: ['Francisco de Orellana', 'Aguarico', 'La Joya de los Sachas', 'Loreto'] },
    { provincia: 'Pastaza', cantones: ['Pastaza', 'Arajuno', 'Mera', 'Santa Clara'] },
    { provincia: 'Pichincha', cantones: ['Quito', 'Cayambe', 'Mejía', 'Pedro Moncayo', 'Pedro Vicente Maldonado', 'Puerto Quito', 'Rumiñahui', 'San Miguel de Los Bancos'] },
    { provincia: 'Santa Elena', cantones: ['Santa Elena', 'La Libertad', 'Salinas'] },
    { provincia: 'Santo Domingo de los Tsáchilas', cantones: ['Santo Domingo', 'La Concordia'] },
    { provincia: 'Sucumbíos', cantones: ['Lago Agrio', 'Cascales', 'Cuyabeno', 'Gonzalo Pizarro', 'Putumayo', 'Shushufindi', 'Sucumbíos'] },
    { provincia: 'Tungurahua', cantones: ['Ambato', 'Baños de Agua Santa', 'Cevallos', 'Mocha', 'Patate', 'Quero', 'San Pedro de Pelileo', 'Santiago de Píllaro', 'Tisaleo'] },
    { provincia: 'Zamora Chinchipe', cantones: ['Zamora', 'Centinela del Cóndor', 'Chinchipe', 'El Pangui', 'Nangaritza', 'Palanda', 'Paquisha', 'Yacuambi', 'Yantzaza'] },
  ];

  const api = { PROVINCIAS_ECUADOR };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    root.Sim = root.Sim || {};
    root.Sim.locations = api;
  }
})(typeof window !== 'undefined' ? window : globalThis);

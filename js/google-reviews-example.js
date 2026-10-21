const placeId = 'TU_PLACE_ID_DE_GOOGLE';
const apiKey = 'TU_API_KEY';
const url = `https://googleapis.com{placeId}&fields=reviews&key=${apiKey}&language=es`;

fetch(url)
  .then(response => response.json())
  .then(data => {
    const reviews = data.result.reviews;
    const container = document.getElementById('google-reviews-container');

    reviews.forEach(review => {
      const reviewElement = document.createElement('div');
      reviewElement.classList.add('review-card');
      reviewElement.innerHTML = `
        <p><strong>${review.author_name}</strong> (${review.rating} ⭐)</p>
        <p>"${review.text}"</p>
      `;
      container.appendChild(reviewElement);
    });
  })
  .catch(error => console.error('Error al cargar reseñas:', error));

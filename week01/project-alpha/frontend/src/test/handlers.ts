import { http, HttpResponse } from 'msw';

const BASE_URL = 'http://localhost:8000/api/v1';

export const handlers = [
  http.get(`${BASE_URL}/tickets`, () => {
    return HttpResponse.json({
      data: [
        {
          id: 1,
          title: 'Test Ticket 1',
          description: 'Description 1',
          status: 'open',
          labels: [],
          created_at: '2024-01-01T00:00:00',
          updated_at: '2024-01-01T00:00:00',
        },
        {
          id: 2,
          title: 'Test Ticket 2',
          description: 'Description 2',
          status: 'completed',
          labels: [],
          created_at: '2024-01-02T00:00:00',
          updated_at: '2024-01-02T00:00:00',
        },
      ],
      pagination: {
        page: 1,
        page_size: 20,
        total: 2,
        total_pages: 1,
      },
    });
  }),

  http.get(`${BASE_URL}/tickets/:id`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id: Number(id),
      title: `Test Ticket ${id}`,
      description: `Description ${id}`,
      status: 'open',
      labels: [],
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-01T00:00:00',
    });
  }),

  http.post(`${BASE_URL}/tickets`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        id: 3,
        ...(body as object),
        status: 'open',
        labels: [],
        created_at: '2024-01-03T00:00:00',
        updated_at: '2024-01-03T00:00:00',
      },
      { status: 201 }
    );
  }),

  http.put(`${BASE_URL}/tickets/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    return HttpResponse.json({
      id: Number(id),
      title: (body as { title?: string }).title || `Test Ticket ${id}`,
      description: (body as { description?: string }).description || `Description ${id}`,
      status: 'open',
      labels: [],
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-04T00:00:00',
    });
  }),

  http.delete(`${BASE_URL}/tickets/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  http.post(`${BASE_URL}/tickets/:id/complete`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id: Number(id),
      title: `Test Ticket ${id}`,
      description: `Description ${id}`,
      status: 'completed',
      labels: [],
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-04T00:00:00',
    });
  }),

  http.post(`${BASE_URL}/tickets/:id/cancel`, ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id: Number(id),
      title: `Test Ticket ${id}`,
      description: `Description ${id}`,
      status: 'cancelled',
      labels: [],
      created_at: '2024-01-01T00:00:00',
      updated_at: '2024-01-04T00:00:00',
    });
  }),

  http.get(`${BASE_URL}/labels`, () => {
    return HttpResponse.json({
      data: [
        { id: 1, name: 'Bug', color: '#FF0000' },
        { id: 2, name: 'Feature', color: '#00FF00' },
      ],
    });
  }),

  http.post(`${BASE_URL}/labels`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      {
        id: 3,
        ...(body as object),
      },
      { status: 201 }
    );
  }),

  http.put(`${BASE_URL}/labels/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    return HttpResponse.json({
      id: Number(id),
      ...(body as object),
    });
  }),

  http.delete(`${BASE_URL}/labels/:id`, () => {
    return new HttpResponse(null, { status: 204 });
  }),
];

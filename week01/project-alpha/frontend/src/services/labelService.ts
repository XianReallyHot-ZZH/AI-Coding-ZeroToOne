import api from './api';
import { Label, LabelListResponse, CreateLabelRequest, UpdateLabelRequest } from '../types/label';

export const labelService = {
  getLabels: async (): Promise<Label[]> => {
    const response = await api.get<LabelListResponse>('/labels');
    return response.data.data;
  },

  getLabel: async (id: number): Promise<Label> => {
    const response = await api.get<Label>(`/labels/${id}`);
    return response.data;
  },

  createLabel: async (data: CreateLabelRequest): Promise<Label> => {
    const response = await api.post<Label>('/labels', data);
    return response.data;
  },

  updateLabel: async (id: number, data: UpdateLabelRequest): Promise<Label> => {
    const response = await api.put<Label>(`/labels/${id}`, data);
    return response.data;
  },

  deleteLabel: async (id: number): Promise<void> => {
    await api.delete(`/labels/${id}`);
  },
};

export default labelService;

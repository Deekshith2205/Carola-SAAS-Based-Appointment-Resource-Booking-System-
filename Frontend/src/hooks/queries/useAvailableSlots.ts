import { useQuery } from '@tanstack/react-query';
import { api } from '../../services/api';
import type { ApiSuccessResponse } from '../../types';

interface AvailableSlotsQuery {
  businessId: string;
  serviceId: string;
  date: string;
  staffId?: string;
}

export function useAvailableSlots({ businessId, serviceId, date, staffId }: AvailableSlotsQuery) {
  return useQuery<string[]>({
    queryKey: ['available-slots', businessId, serviceId, date, staffId],
    queryFn: async () => {
      if (!businessId || !serviceId || !date) return [];
      
      const params = new URLSearchParams({
        businessId,
        serviceId,
        date,
      });
      if (staffId && staffId !== 'any') {
        params.append('staffId', staffId);
      }

      const res = await api.get<ApiSuccessResponse<{ slots: string[] }>>(`/appointments/slots?${params.toString()}`);
      return res.data.data.slots;
    },
    enabled: !!businessId && !!serviceId && !!date,
    staleTime: 60 * 1000,
  });
}

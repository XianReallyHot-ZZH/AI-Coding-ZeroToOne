import { useToast } from './ui/use-toast';
import { Toaster as UiToaster } from './ui/toaster';
import { useEffect } from 'react';

interface ToasterProps {
  error: string | null;
}

export function Toaster({ error }: ToasterProps) {
  const { toast } = useToast();

  useEffect(() => {
    if (error) {
      toast({
        variant: 'destructive',
        title: '错误',
        description: error,
      });
    }
  }, [error, toast]);

  return <UiToaster />;
}

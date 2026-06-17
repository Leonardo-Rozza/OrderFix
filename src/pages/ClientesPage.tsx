import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { DataTable } from '../components/DataTable';
import { Modal } from '../components/Modal';
import { FormField } from '../components/FormField';
import { useClientesQuery } from '../api/queries/clientes.queries';
import {
  useCreateClienteMutation,
  useUpdateClienteMutation,
  useDeleteClienteMutation,
} from '../api/mutations/clientes.mutations';
import type { Cliente, ClienteCreate } from '../types';

const clienteSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').max(60, 'Máximo 60 caracteres'),
  apellido: z.string().min(1, 'El apellido es requerido').max(60, 'Máximo 60 caracteres'),
  email: z.string().email('Email inválido').max(120, 'Máximo 120 caracteres').optional().or(z.literal('')),
  telefono: z.string().min(1, 'El teléfono es requerido').max(20, 'Máximo 20 caracteres'),
  direccion: z.string().max(255, 'Máximo 255 caracteres').optional().or(z.literal('')),
});

type ClienteFormData = z.infer<typeof clienteSchema>;

const inputClasses = (hasError: boolean) =>
  `w-full rounded-lg border px-3 py-2 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 dark:text-gray-100 ${
    hasError ? 'border-red-300 dark:border-red-400' : 'border-gray-300 dark:border-gray-700 dark:bg-gray-900'
  }`;

export const ClientesPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  const { data: clientes = [], isLoading } = useClientesQuery();
  const createMutation = useCreateClienteMutation();
  const updateMutation = useUpdateClienteMutation();
  const deleteMutation = useDeleteClienteMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ClienteFormData>({
    resolver: zodResolver(clienteSchema),
    defaultValues: editingCliente
      ? {
          nombre: editingCliente.nombre,
          apellido: editingCliente.apellido,
          email: editingCliente.email ?? '',
          telefono: editingCliente.telefono,
          direccion: editingCliente.direccion ?? '',
        }
      : undefined,
  });

  const onSubmit = async (data: ClienteFormData) => {
    const payload: ClienteCreate = {
      nombre: data.nombre,
      apellido: data.apellido,
      telefono: data.telefono,
      email: data.email && data.email.trim() !== '' ? data.email : undefined,
      direccion: data.direccion && data.direccion.trim() !== '' ? data.direccion : undefined,
    };

    if (editingCliente) {
      await updateMutation.mutateAsync({
        id: editingCliente.id,
        ...payload,
      });
    } else {
      await createMutation.mutateAsync(payload);
    }
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCliente(null);
    reset();
  };

  const handleEdit = (cliente: Cliente) => {
    setEditingCliente(cliente);
    setIsModalOpen(true);
    reset({
      nombre: cliente.nombre,
      apellido: cliente.apellido,
      email: cliente.email ?? '',
      telefono: cliente.telefono,
      direccion: cliente.direccion ?? '',
    });
  };

  const handleDelete = async (cliente: Cliente) => {
    if (window.confirm(`¿Estás seguro de eliminar a ${cliente.nombre} ${cliente.apellido}?`)) {
      await deleteMutation.mutateAsync(cliente.id);
    }
  };

  const columns = [
    { header: 'ID', accessor: 'id' as const },
    { header: 'Nombre', accessor: 'nombre' as const },
    { header: 'Apellido', accessor: 'apellido' as const },
    { header: 'Email', accessor: 'email' as const },
    { header: 'Teléfono', accessor: 'telefono' as const },
    {
      header: 'Dirección',
      accessor: (row: Cliente) => row.direccion || '-',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clientes</h1>
            <p className="text-gray-600 dark:text-gray-400">Gestiona los clientes del sistema</p>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-indigo-700 sm:w-auto"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Nuevo Cliente
          </button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
          <DataTable
            data={clientes}
            columns={columns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            isLoading={isLoading}
            emptyMessage="No hay clientes registrados"
          />
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
          size="md"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Nombre" error={errors.nombre?.message} required htmlFor="nombre">
                <input id="nombre" type="text" {...register('nombre')} className={inputClasses(!!errors.nombre)} />
              </FormField>
              <FormField label="Apellido" error={errors.apellido?.message} required htmlFor="apellido">
                <input id="apellido" type="text" {...register('apellido')} className={inputClasses(!!errors.apellido)} />
              </FormField>
            </div>

            <FormField label="Email" error={errors.email?.message} htmlFor="email">
              <input id="email" type="email" {...register('email')} className={inputClasses(!!errors.email)} />
            </FormField>

            <FormField label="Teléfono" error={errors.telefono?.message} required htmlFor="telefono">
              <input id="telefono" type="text" {...register('telefono')} className={inputClasses(!!errors.telefono)} />
            </FormField>

            <FormField label="Dirección" error={errors.direccion?.message} htmlFor="direccion">
              <input id="direccion" type="text" {...register('direccion')} className={inputClasses(!!errors.direccion)} />
            </FormField>

            <div className="flex flex-col-reverse gap-3 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800 sm:w-auto"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-white transition hover:bg-indigo-700 disabled:opacity-50 sm:w-auto"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Guardando...'
                  : editingCliente
                  ? 'Actualizar'
                  : 'Crear'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </DashboardLayout>
  );
};

-- ================================================
-- DATA MCBA — Supabase Schema
-- Ejecutar en el SQL Editor de tu proyecto Supabase
-- ================================================

-- 1. Tabla de perfiles (vinculada a auth.users)
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  email text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.profiles enable row level security;

create policy "Usuarios ven su propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuarios actualizan su propio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Usuarios insertan su propio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);


-- 2. Tabla de archivos cargados
create table public.file_uploads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  file_name text not null,
  file_type text not null,
  file_size bigint,
  status text default 'processed',
  transaction_count integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.file_uploads enable row level security;

create policy "Usuarios ven sus propios uploads"
  on public.file_uploads for select
  using (auth.uid() = user_id);

create policy "Usuarios insertan sus propios uploads"
  on public.file_uploads for insert
  with check (auth.uid() = user_id);

create policy "Usuarios actualizan sus propios uploads"
  on public.file_uploads for update
  using (auth.uid() = user_id);

create policy "Usuarios eliminan sus propios uploads"
  on public.file_uploads for delete
  using (auth.uid() = user_id);


-- 3. Tabla de transacciones
create table public.transactions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  upload_id uuid references public.file_uploads on delete set null,
  date date not null,
  description text not null,
  amount numeric(15, 2) not null,
  type text not null check (type in ('income', 'expense')),
  category text default 'other',
  reference text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.transactions enable row level security;

create policy "Usuarios ven sus propias transacciones"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Usuarios insertan sus propias transacciones"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Usuarios actualizan sus propias transacciones"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Usuarios eliminan sus propias transacciones"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- Índices para performance
create index transactions_user_date on public.transactions (user_id, date desc);
create index transactions_user_type on public.transactions (user_id, type);


-- 4. Función para crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger en auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

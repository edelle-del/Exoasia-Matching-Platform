-- Data room files
create table if not exists public.data_room_files (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  name       text not null,
  file_path  text not null,
  file_size  bigint,
  mime_type  text,
  created_at timestamptz not null default now()
);

-- Data room access requests
create table if not exists public.data_room_access_requests (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  status       text not null default 'pending', -- pending | approved | denied
  message      text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint data_room_request_unique unique (requester_id, owner_id)
);

alter table public.data_room_files enable row level security;
alter table public.data_room_access_requests enable row level security;

-- data_room_files policies
create policy "Owner can manage their data room files"
  on public.data_room_files for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "Approved requester can read data room files"
  on public.data_room_files for select
  to authenticated
  using (
    exists (
      select 1 from public.data_room_access_requests r
      where r.requester_id = auth.uid()
        and r.owner_id = data_room_files.owner_id
        and r.status = 'approved'
    )
  );

create policy "Advisors can read all data room files"
  on public.data_room_files for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.member_role in ('advisor', 'admin')
    )
  );

-- data_room_access_requests policies
create policy "Requester can manage their own requests"
  on public.data_room_access_requests for all
  to authenticated
  using (requester_id = auth.uid())
  with check (requester_id = auth.uid());

create policy "Owner can view and update requests for their data room"
  on public.data_room_access_requests for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('data-room', 'data-room', false)
on conflict (id) do nothing;

drop policy if exists "Data room owner upload" on storage.objects;
create policy "Data room owner upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'data-room'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Data room owner update" on storage.objects;
create policy "Data room owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'data-room'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Data room owner delete" on storage.objects;
create policy "Data room owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'data-room'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Data room owner read" on storage.objects;
create policy "Data room owner read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'data-room'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Approved requester read data room" on storage.objects;
create policy "Approved requester read data room"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'data-room'
    and exists (
      select 1 from public.data_room_access_requests r
      where r.owner_id = ((storage.foldername(name))[1])::uuid
        and r.requester_id = auth.uid()
        and r.status = 'approved'
    )
  );

drop policy if exists "Advisors read all data room files in storage" on storage.objects;
create policy "Advisors read all data room files in storage"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'data-room'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.member_role in ('advisor', 'admin')
    )
  );

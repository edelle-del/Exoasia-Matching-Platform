-- Create storage bucket for pitch decks
insert into storage.buckets (id, name, public)
values ('pitch-decks', 'pitch-decks', false)
on conflict (id) do nothing;

-- Allow authenticated users to upload their own pitch deck
create policy "Users can upload their own pitch deck"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'pitch-decks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to update/replace their own pitch deck
create policy "Users can update their own pitch deck"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'pitch-decks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow authenticated users to read their own pitch deck
create policy "Users can read their own pitch deck"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'pitch-decks'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow advisors and admins to read all pitch decks
create policy "Advisors can read all pitch decks"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'pitch-decks'
    and exists (
      select 1 from profiles
      where profiles.id = auth.uid()
      and profiles.role in ('advisor', 'admin')
    )
  );

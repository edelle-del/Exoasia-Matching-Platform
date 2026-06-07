-- Cofounders on a project can read the project owner's data room files.
-- A cofounder is anyone in cofounder_links whose project_id matches a project
-- owned by the data room file's owner_id.
create policy "Cofounder can read data room files for their project"
  on public.data_room_files for select
  to authenticated
  using (
    exists (
      select 1
      from public.cofounder_links cl
      join public.projects p on p.id = cl.project_id
      where p.owner_id = data_room_files.owner_id
        and cl.cofounder_profile_id = auth.uid()
    )
  );

-- Cofounders can also read the corresponding storage objects.
drop policy if exists "Cofounder read data room storage" on storage.objects;
create policy "Cofounder read data room storage"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'data-room'
    and exists (
      select 1
      from public.cofounder_links cl
      join public.projects p on p.id = cl.project_id
      where p.owner_id = ((storage.foldername(name))[1])::uuid
        and cl.cofounder_profile_id = auth.uid()
    )
  );

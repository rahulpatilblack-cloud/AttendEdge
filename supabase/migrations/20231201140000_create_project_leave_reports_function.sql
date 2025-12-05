-- Create a function to get project leave reports
create or replace function get_project_leave_reports(
  company_id uuid,
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
returns table (
  id uuid,
  employee_name text,
  project_name text,
  leave_type text,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  total_days integer,
  status text
)
language sql
as $$
  select 
    plr.id,
    e.name as employee_name,
    p.name as project_name,
    lt.name as leave_type,
    plr.start_date,
    plr.end_date,
    plr.total_days,
    plr.status
  from 
    project_leave_requests plr
    join employees e on plr.employee_id = e.id
    join projects p on plr.project_id = p.id
    join leave_types lt on plr.leave_type_id = lt.id
  where 
    e.company_id = $1
    and (
      (plr.start_date between $2 and $3)
      or (plr.end_date between $2 and $3)
      or (plr.start_date <= $2 and plr.end_date >= $3)
    )
  order by 
    plr.start_date desc;
$$;

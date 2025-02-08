import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText
} from '@mui/material'
import { queryOptions, useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute, Link, Outlet } from '@tanstack/react-router'

export const getAreas = queryOptions({
  queryKey: ['areas'],
  queryFn: () => fetch('https://repoe-fork.github.io/poe2/world_areas.json').then(r => r.json()),
})

export interface Layout {
  id: string,
  file: string,
}

export interface Area {
  id: string,
  name: string,
  layouts: Layout[]
}

export const Route = createFileRoute('/areas')({
  component: AreasComponent,
  loader: ({ context: { queryClient } }) => {
    return queryClient.ensureQueryData(getAreas)
  },
})

function AreasComponent() {
  const query = useSuspenseQuery(getAreas)
  const areas: Record<string, Area> = query.data

  return (
    <div className="p-2">
      <Drawer variant="persistent" anchor="right" open>
        <List>
          {Object.values(areas).map(({ id, name }) => (
            <ListItem key={id} disablePadding>
              <ListItemButton component={Link} to={`/areas/${id}`}>
                <ListItemText primary={name} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Outlet />
    </div>
  )
}

// Cloudflare Worker for Project Dashboard - API only

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Only handle /api/ routes
    if (!url.pathname.startsWith('/api/')) {
      return new Response('Not an API route', { status: 404 });
    }

    const path = url.pathname.replace('/api/', '');

    try {
      if (path === 'login' && request.method === 'POST') {
        const { password } = await request.json();
        if (password === 'admin123') {
          const token = btoa(JSON.stringify({ auth: true, timestamp: Date.now() }));
          return new Response(JSON.stringify({ token }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        return new Response(JSON.stringify({ error: 'Invalid password' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'No token provided' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const db = env.DB;

      if (path === 'projects' && request.method === 'GET') {
        const { archived } = Object.fromEntries(url.searchParams);
        const archivedFilter = archived === 'true' ? 1 : 0;
        
        const { results } = await db.prepare(`
          SELECT p.*, 
            COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
            COUNT(t.id) as total_tasks
          FROM projects p
          LEFT JOIN tasks t ON p.id = t.project_id
          WHERE p.archived = ?
          GROUP BY p.id
          ORDER BY p.priority DESC, p.created_at DESC
        `).bind(archivedFilter).all();
        
        return new Response(JSON.stringify(results), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path.startsWith('projects/') && request.method === 'GET') {
        const id = path.split('/')[1];
        const project = await db.prepare('SELECT * FROM projects WHERE id = ?').bind(id).first();
        
        if (!project) {
          return new Response(JSON.stringify({ error: 'Project not found' }), {
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const { results: tasks } = await db.prepare(
          'SELECT * FROM tasks WHERE project_id = ? ORDER BY order_index, id'
        ).bind(id).all();
        
        return new Response(JSON.stringify({ ...project, tasks }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === 'projects' && request.method === 'POST') {
        const { name, description, priority, project_url, project_type } = await request.json();
        
        const result = await db.prepare(
          'INSERT INTO projects (name, description, priority, project_url, project_type) VALUES (?, ?, ?, ?, ?)'
        ).bind(name, description, priority || 0, project_url, project_type || 'webapp').run();
        
        return new Response(JSON.stringify({ 
          id: result.meta.last_row_id, 
          name, 
          description, 
          priority, 
          project_url, 
          project_type 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path.startsWith('projects/') && request.method === 'PATCH') {
        const id = path.split('/')[1];
        const { name, description, status, priority, archived, project_url, project_type } = await request.json();
        
        await db.prepare(`
          UPDATE projects 
          SET name = COALESCE(?, name), 
              description = COALESCE(?, description), 
              status = COALESCE(?, status), 
              priority = COALESCE(?, priority), 
              archived = COALESCE(?, archived), 
              project_url = COALESCE(?, project_url), 
              project_type = COALESCE(?, project_type), 
              updated_at = CURRENT_TIMESTAMP 
          WHERE id = ?
        `).bind(name, description, status, priority, archived, project_url, project_type, id).run();
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path.startsWith('projects/') && request.method === 'DELETE') {
        const id = path.split('/')[1];
        await db.prepare('DELETE FROM tasks WHERE project_id = ?').bind(id).run();
        await db.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path === 'tasks' && request.method === 'POST') {
        const { project_id, title, description, estimated_minutes } = await request.json();
        
        const result = await db.prepare(
          'INSERT INTO tasks (project_id, title, description, estimated_minutes) VALUES (?, ?, ?, ?)'
        ).bind(project_id, title, description, estimated_minutes || 0).run();
        
        return new Response(JSON.stringify({ 
          id: result.meta.last_row_id, 
          project_id, 
          title, 
          description, 
          status: 'pending' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path.startsWith('tasks/') && request.method === 'PATCH') {
        const id = path.split('/')[1];
        const { status, title, description } = await request.json();
        const completed_at = status === 'done' ? new Date().toISOString() : null;
        
        await db.prepare(`
          UPDATE tasks 
          SET status = COALESCE(?, status), 
              title = COALESCE(?, title), 
              description = COALESCE(?, description), 
              completed_at = ? 
          WHERE id = ?
        `).bind(status, title, description, completed_at, id).run();
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (path.startsWith('tasks/') && request.method === 'DELETE') {
        const id = path.split('/')[1];
        await db.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
        
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

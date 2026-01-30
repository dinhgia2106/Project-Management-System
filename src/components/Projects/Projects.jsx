import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import './Projects.css'

export default function Projects() {
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [newProject, setNewProject] = useState({ name: '', description: '' })
    const { profile, isAdminOrMod } = useAuth()

    useEffect(() => {
        fetchProjects()
    }, [])

    const fetchProjects = async () => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select(`
          *,
          owner:profiles!projects_owner_id_fkey(display_name),
          project_members(user_id)
        `)
                .order('created_at', { ascending: false })

            if (error) throw error
            setProjects(data || [])
        } catch (error) {
            console.error('Error fetching projects:', error)
        } finally {
            setLoading(false)
        }
    }

    const createProject = async (e) => {
        e.preventDefault()
        try {
            const { data, error } = await supabase
                .from('projects')
                .insert({
                    name: newProject.name,
                    description: newProject.description,
                    owner_id: profile.id
                })
                .select()
                .single()

            if (error) throw error

            await supabase
                .from('project_members')
                .insert({ project_id: data.id, user_id: profile.id })

            await supabase.rpc('log_activity', {
                p_action: 'create_project',
                p_target_type: 'project',
                p_target_id: data.id,
                p_details: { name: newProject.name }
            })

            setShowModal(false)
            setNewProject({ name: '', description: '' })
            fetchProjects()
        } catch (error) {
            console.error('Error creating project:', error)
        }
    }

    if (loading) {
        return (
            <div className="projects">
                <header className="page-header">
                    <h1>Projects</h1>
                </header>
                <p className="loading">Loading projects...</p>
            </div>
        )
    }

    return (
        <div className="projects">
            <header className="page-header">
                <div className="header-content">
                    <div>
                        <h1>Projects</h1>
                        <p>Manage your Scrum projects</p>
                    </div>
                    {isAdminOrMod && (
                        <button className="btn-create" onClick={() => setShowModal(true)}>
                            + New Project
                        </button>
                    )}
                </div>
            </header>

            <div className="projects-grid">
                {projects.length === 0 ? (
                    <div className="empty-state">
                        <p>No projects yet. Create your first project to get started!</p>
                    </div>
                ) : (
                    projects.map(project => (
                        <div key={project.id} className="project-card">
                            <h3>{project.name}</h3>
                            <p className="project-desc">{project.description || 'No description'}</p>
                            <div className="project-meta">
                                <span>Owner: {project.owner?.display_name}</span>
                                <span>{project.project_members?.length || 0} members</span>
                            </div>
                            <button className="btn-view">View Project</button>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2>Create New Project</h2>
                        <form onSubmit={createProject}>
                            <div className="form-group">
                                <label htmlFor="name">Project Name</label>
                                <input
                                    type="text"
                                    id="name"
                                    value={newProject.name}
                                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    value={newProject.description}
                                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                                    rows={3}
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn-submit">
                                    Create Project
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}

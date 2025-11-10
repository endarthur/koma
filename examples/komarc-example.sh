# Example .komarc file
# Copy this to /home/.komarc in Koma to customize your environment

# Welcome message
echo "Koma Workstation - Olivine Kernel"
echo ""

# Create standard directory structure
mkdir -p /home/projects
mkdir -p /home/scripts
mkdir -p /home/data
mkdir -p /home/tmp

# Change to projects directory
cd /home/projects

# Display workspace status
echo "Workspace initialized"
echo "Directories: projects/ scripts/ data/ tmp/"

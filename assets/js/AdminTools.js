let currentMinterToolPage = 'overview'; // Track the current page

const loadMinterAdminToolsPage = async () => {
    // Remove all body content except for menu elements
    const bodyChildren = document.body.children;
    for (let i = bodyChildren.length - 1; i >= 0; i--) {
        const child = bodyChildren[i];
        if (!child.classList.contains('menu')) {
            child.remove()
        }
    }

    const avatarUrl = `/arbitrary/THUMBNAIL/${userState.accountName}/qortal_avatar`
  
    // Set the background image directly from a file
    const mainContent = document.createElement('div')
    // In your 'AdminTools' code
    mainContent.innerHTML = `
    <div class="tools-main mbr-parallax-background cid-ttRnlSkg2R">
      <div class="tools-header" style="color: white; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 10px;">
        <div><h1 style="font-size: 50px; margin: 0;">Admin Tools</h1></div>
        <div class="user-info" style="border: 1px solid lightblue; padding: 5px; color: lightblue; display: flex; align-items: center; justify-content: center;">
          <img src="${avatarUrl}" alt="User Avatar" class="user-avatar" style="width: 50px; height: 50px; border-radius: 50%; margin-right: 10px;">
          <span>${userState.accountName || 'Guest'}</span>
        </div>
        <div><h2>Welcome to Admin Tools</h2></div>
        <div>
          <p>On this page you will find admin functionality for the Q-Mintership App. Including the 'blockList' for blocking comments from certain names, and manual creation of invite transactions.</p>
          <p>More features will be added as time goes on. This is the start of the functionality here.</p>
        </div>
      </div>
      
      <div id="tools-submenu" class="tools-submenu">
        <div class="tools-buttons" style="display: flex; gap: 1em; justify-content: center;">
          <button id="toggle-blocklist-button" class="publish-card-button">Add/Remove blockedUsers</button>
          <button id="create-group-invite" class="publish-card-button">Create Pending Group Invite</button>
        </div>
        
        <div id="tools-window" class="tools-window" style="margin-top: 2em;">
          
          <div id="blocklist-container" class="blocklist-form" style="display: none;">
            <h3 style="margin-top: 0;">Comment Block List</h3>
            <div id="blocklist-display" class="blocklist-display" style="margin-bottom: 1em;"></div>
            
            <input
              type="text"
              id="blocklist-input"
              class="blocklist-input"
              placeholder="Enter name to block/unblock"
              style="margin-bottom: 1em;"
            />
            
            <div class="blocklist-button-container publish-card-form">
              <button id="blocklist-add-button" class="publish-card-button">Add</button>
              <button id="blocklist-remove-button" class="publish-card-button">Remove</button>
            </div>
          </div>
          
        </div>
      </div>
    </div>
    `

    document.body.appendChild(mainContent)
  
    addToolsPageEventListeners()
}
  
function addToolsPageEventListeners() {
  document.getElementById("toggle-blocklist-button").addEventListener("click", async () => {
    const container = document.getElementById("blocklist-container")
    // toggle show/hide
    container.style.display = (container.style.display === "none" ? "flex" : "none")
  
    // if showing, load the block list
    if (container.style.display === "flex") {
      const currentBlockList = await fetchBlockList()
      displayBlockList(currentBlockList)
    }
  })

  document.getElementById("blocklist-add-button").addEventListener("click", async () => {
    const blocklistInput = document.getElementById("blocklist-input")
    const nameToAdd = blocklistInput.value.trim()
    if (!nameToAdd) return
  
    // fetch existing
    const currentBlockList = await fetchBlockList()
    // add if not already in list
    if (!currentBlockList.includes(nameToAdd)) {
      currentBlockList.push(nameToAdd)
    }
  
    // publish updated
    await publishBlockList(currentBlockList)
    displayBlockList(currentBlockList)
    blocklistInput.value = ""
    alert(`"${nameToAdd}" added to the block list!`)
  })
  
  // Remove
  document.getElementById("blocklist-remove-button").addEventListener("click", async () => {
    const blocklistInput = document.getElementById("blocklist-input")
    const nameToRemove = blocklistInput.value.trim()
    if (!nameToRemove) return
  
    // fetch existing
    let currentBlockList = await fetchBlockList()
    // remove if present
    currentBlockList = currentBlockList.filter(name => name !== nameToRemove)
  
    // publish updated
    await publishBlockList(currentBlockList)
    displayBlockList(currentBlockList)
    blocklistInput.value = ""
    alert(`"${nameToRemove}" removed from the block list (if it was present).`)
  })

}

const displayBlockList = (blockedNames) => {
  const blocklistDisplay = document.getElementById("blocklist-display")
  if (!blockedNames || blockedNames.length === 0) {
    blocklistDisplay.innerHTML = "<p>No blocked users currently.</p>"
    return
  }
  blocklistDisplay.innerHTML = `
    <ul>
      ${blockedNames.map(name => `<li>${name}</li>`).join("")}
    </ul>
  `
}



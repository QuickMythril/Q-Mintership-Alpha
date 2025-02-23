// // NOTE - Change isTestMode to false prior to actual release ---- !important - You may also change identifier if you want to not show older cards.
const testMode = false
const minterCardIdentifierPrefix = "Minter-board-card"
let isExistingCard = false
let existingCardData = {}
let existingCardIdentifier = {}
const MIN_ADMIN_YES_VOTES = 9;
const GROUP_APPROVAL_FEATURE_TRIGGER_HEIGHT = 2012800 //TODO update this to correct featureTrigger height when known, either that, or pull from core.
let featureTriggerPassed = false
let isApproved = false


const loadMinterBoardPage = async () => {
  // Clear existing content on the page
  const bodyChildren = document.body.children
  for (let i = bodyChildren.length - 1; i >= 0; i--) {
    const child = bodyChildren[i];
    if (!child.classList.contains("menu")) {
      child.remove()
    }
  }

  // Add the "Minter Board" content
  const mainContent = document.createElement("div")
  const publishButtonColor = '#527c9d'
  const minterBoardNameColor = '#527c9d'
  mainContent.innerHTML = `
    <div class="minter-board-main" style="padding: 0.5vh; text-align: center;">
  
      <!-- Board Title + Intro -->
      <h1 style="color: #527c9d;">The Minter Board</h1>
      <p style="font-size: 1.2em; color:rgb(85, 119, 101)">
        The Minter Board is where Minting Rights are Delegated.
      </p>
      <p style="font-size: 1.1em; color:rgb(85, 119, 119)">
        To obtain minting rights, click 'PUBLISH CARD' and create your card. A subsequent vote will approve/deny your card. 
      </p>
      <p>
        After your card has received the necessary invite, return to the card and click the Join Group button to join the MINTER group.
        (A Detailed how-to guide will be coming soon.) 
      </p>

      <div class="card-display-options">
        <!-- Centered heading -->
        <h4 class="options-heading"style="color: #527c9d;">CARD DISPLAY OPTIONS</h4>

        <!-- A flex container for all the controls (sort, time range, checkbox) -->
        <div class="options-row">
          <!-- Sort by -->
          <label for="sort-select" class="options-label">Sort By:</label>
          <select id="sort-select" class="options-select">
            <option value="newest" selected>Date</option>
            <option value="name">Name</option>
            <option value="recent-comments">Newest Comments</option>
            <option value="least-votes">Least Votes</option>
            <option value="most-votes">Most Votes</option>
          </select>

          <!-- Time range -->
          <label for="time-range-select" class="options-label">Show Cards:</label>
          <select id="time-range-select" class="options-select">
            <option value="0">Show ALL Cards Published</option>
            <option value="1">...Within Last 1 Day</option>
            <option value="7">...Within Last 7 Days</option>
            <option value="30">...Within 30 Days</option>
            <option value="45" selected>Published Within Last 45 Days</option>
            <option value="60">...Within 60 Days</option>
            <option value="90">...Within 90 Days</option>
          </select>

          <!-- Show existing checkbox -->
          <label class="options-check">
            <input type="checkbox" id="show-existing-checkbox" />
            Show Existing Minter Cards (History)
          </label>
        </div>
        </div>
        <!-- Card counter heading centered, with actual counter below if desired -->
        <div style="margin-bottom: 1em;">
          <div style="text-align: center; margin-top: 0.5em;">
            <span id="board-card-counter" style="font-size: 1rem; color:rgb(153, 203, 204); padding: 0.5em;">
              <!-- e.g. "5 cards found" -->
            </span>
          </div>
        </div>

        <!-- Row for Publish / Refresh actions -->
        <div class="card-actions" style="margin-bottom: 1em;">
          <button id="publish-card-button" class="publish-card-button">
            PUBLISH CARD
          </button>
          <button id="refresh-cards-button" class="refresh-cards-button"
            style="padding: 1vh;">
            REFRESH CARDS
          </button>
        </div>

        <!-- Container for displayed cards -->
        <div id="cards-container" class="cards-container" style="margin-top: 2vh;"></div>

        <!-- Hidden Publish Card Form -->
        <div id="publish-card-view" class="publish-card-view" style="display: none; text-align: left; padding: 2vh;">
          <form id="publish-card-form" class="publish-card-form">
            <h3>Create or Update Your Card</h3>
            <label for="card-header">Header:</label>
            <input type="text" id="card-header" maxlength="100" placeholder="Enter card header" required>

            <label for="card-content">Content:</label>
            <textarea id="card-content" placeholder="Enter detailed information about why you would like to be a minter... the more the better..." required>
            </textarea>

            <label for="card-links">Links (qortal://...):</label>
            <div id="links-container">
              <input type="text" class="card-link" placeholder="Enter QDN link">
            </div>
            <button type="button" id="add-link-button">Add Another Link</button>
            <button type="submit" id="submit-publish-button">Publish Card</button>
            <button type="button" id="cancel-publish-button">Cancel</button>
          </form>
        </div>
    </div>
  `
  document.body.appendChild(mainContent)
  createScrollToTopButton()

  document.getElementById("publish-card-button").addEventListener("click", async () => {
    try {
      const fetchedCard = await fetchExistingCard(minterCardIdentifierPrefix)
      if (fetchedCard) {
        // An existing card is found
        if (testMode) {
          // In test mode, ask user what to do
          const updateCard = confirm("A card already exists. Do you want to update it?")
          if (updateCard) {
            isExistingCard = true
            await loadCardIntoForm(existingCardData)
            alert("Edit your existing card and publish.")
          } else {
            alert("Test mode: You can now create a new card.")
            isExistingCard = false
            existingCardData = {}
            document.getElementById("publish-card-form").reset()
          }
        } else {
          // Not in test mode, force editing
          alert("A card already exists. Publishing of multiple cards is not allowed. Please update your card.");
          isExistingCard = true;
          await loadCardIntoForm(existingCardData)
        }
      } else {
        // No existing card found
        console.log("No existing card found. Creating a new card.")
        isExistingCard = false
      }

      // Show the form
      const publishCardView = document.getElementById("publish-card-view")
      publishCardView.style.display = "flex"
      document.getElementById("cards-container").style.display = "none"
    } catch (error) {
      console.error("Error checking for existing card:", error)
      alert("Failed to check for existing card. Please try again.")
    }
  })

  document.getElementById("refresh-cards-button").addEventListener("click", async () => {
    const cardsContainer = document.getElementById("cards-container")
    cardsContainer.innerHTML = "<p>Refreshing cards...</p>"
    await loadCards(minterCardIdentifierPrefix)
  })
  

  document.getElementById("cancel-publish-button").addEventListener("click", async () => {
    const cardsContainer = document.getElementById("cards-container")
    cardsContainer.style.display = "flex"; // Restore visibility
    const publishCardView = document.getElementById("publish-card-view")
    publishCardView.style.display = "none"; // Hide the publish form
  })

  document.getElementById("add-link-button").addEventListener("click", async () => {
    const linksContainer = document.getElementById("links-container")
    const newLinkInput = document.createElement("input")
    newLinkInput.type = "text"
    newLinkInput.className = "card-link"
    newLinkInput.placeholder = "Enter QDN link"
    linksContainer.appendChild(newLinkInput)
  })

  document.getElementById("publish-card-form").addEventListener("submit", async (event) => {
    event.preventDefault()
    await publishCard(minterCardIdentifierPrefix)
  })

  document.getElementById("time-range-select").addEventListener("change", async () => {
    // Re-load the cards whenever user chooses a new sort option.
    await loadCards(minterCardIdentifierPrefix)
  })

  document.getElementById("sort-select").addEventListener("change", async () => {
    // Re-load the cards whenever user chooses a new sort option.
    await loadCards(minterCardIdentifierPrefix)
  })

  const showExistingCardsCheckbox = document.getElementById('show-existing-checkbox')
  if (showExistingCardsCheckbox) {
    showExistingCardsCheckbox.addEventListener('change', async (event) => {
      await loadCards(minterCardIdentifierPrefix)
    })
  }

  await featureTriggerCheck()
  await loadCards(minterCardIdentifierPrefix)
}


const extractMinterCardsMinterName = async (cardIdentifier) => {
  // Ensure the identifier starts with the prefix
  if ((!cardIdentifier.startsWith(minterCardIdentifierPrefix)) && (!cardIdentifier.startsWith(addRemoveIdentifierPrefix))) {
    throw new Error('minterCard does not match identifier check')
  } 
  // Split the identifier into parts
  const parts = cardIdentifier.split('-')
  // Ensure the format has at least 3 parts
  if (parts.length < 3) {
    throw new Error('Invalid identifier format')
  }
  try {
    if (cardIdentifier.startsWith(minterCardIdentifierPrefix)){
      const searchSimpleResults = await searchSimple('BLOG_POST', `${cardIdentifier}`, '', 1, 0, '', false, true)
      const minterName = await searchSimpleResults.name
      return minterName
    } else if (cardIdentifier.startsWith(addRemoveIdentifierPrefix)) {
      const searchSimpleResults = await searchSimple('BLOG_POST', `${cardIdentifier}`, '', 1, 0, '', false, true)
      const publisherName = searchSimpleResults.name
      const cardDataResponse = await qortalRequest({
        action: "FETCH_QDN_RESOURCE",
        name: publisherName,
        service: "BLOG_POST",
        identifier: cardIdentifier,
      })
      let nameInvalid = false
      const minterName = cardDataResponse.minterName
      if (minterName){
        return minterName
      } else {
        nameInvalid = true
        console.warn(`fuckery detected on identifier: ${cardIdentifier}, hello dipshit Mythril!, name invalid? Name doesn't match publisher? Returning invalid flag + publisherName...`)
        return publisherName
      }
    }
  } catch (error) {
    throw error
  }
}

const groupAndLabelByIdentifier = (allCards) => {
  // Group by identifier
  const mapById = new Map()
  allCards.forEach(card => {
    if (!mapById.has(card.identifier)) {
      mapById.set(card.identifier, [])
    }
    mapById.get(card.identifier).push(card)
  })
  // For each identifier's group, sort oldest->newest so the first is "master"
  const output = []
  for (const [identifier, group] of mapById.entries()) {
    group.sort((a, b) => {
      const aTime = a.created || 0
      const bTime = b.created || 0
      return aTime - bTime  // oldest first
    })
    // Mark the first as master
    group[0].isMaster = true
    // The rest are updates
    for (let i = 1; i < group.length; i++) {
      group[i].isMaster = false
    }
    // push them all to output
    output.push(...group)
  }

  return output
}

const groupByIdentifierOldestFirst = (allCards) => {
  // map of identifier => array of cards
  const mapById = new Map()

  allCards.forEach(card => {
    if (!mapById.has(card.identifier)) {
      mapById.set(card.identifier, [])
    }
    mapById.get(card.identifier).push(card)
  })
  // sort each group oldest->newest
  for (const [identifier, group] of mapById.entries()) {
    group.sort((a, b) => {
      const aTime = a.created || 0
      const bTime = b.created || 0
      return aTime - bTime // oldest first
    })
  }

  return mapById
}

const buildMinterNameGroups = async (mapById) => {
  // We'll build an array of objects: { minterName, cards }
  // Then we can combine any that share the same minterName.
  const nameGroups = []

  for (let [identifier, group] of mapById.entries()) {
    // group[0] is the oldest => "master" card
    let masterCard = group[0]
    // Filter out any cards that are not published by the 'masterPublisher'
    const masterPublisherName = masterCard.name
    // Remove any cards in this identifier group that have a different publisherName
    const filteredGroup = group.filter(c => c.name === masterPublisherName)
    // If filtering left zero cards, skip entire group
    if (!filteredGroup.length) {
      console.warn(`All cards removed for identifier=${identifier} (different publishers). Skipping.`)
      continue
    }
    // Reassign group to the filtered version, then re-define masterCard
    group = filteredGroup
    masterCard = group[0] // oldest after filtering
    // attempt to obtain minterName from the master card
    let masterMinterName
    try {
      masterMinterName = await extractMinterCardsMinterName(masterCard.identifier)
    } catch (err) {
      console.warn(`Skipping entire group ${identifier}, no valid minterName from master`, err)
      continue
    }
    // Store an object with the minterName we extracted, plus all cards in that group
    nameGroups.push({
      minterName: masterMinterName,
      cards: group // includes the master & updates
    })
  }
  // Combine them: minterName => array of *all* cards from all matching groups
  const combinedMap = new Map()
  for (const entry of nameGroups) {
    const mName = entry.minterName
    if (!combinedMap.has(mName)) {
      combinedMap.set(mName, [])
    }
    combinedMap.get(mName).push(...entry.cards)
  }

  return combinedMap
}


const getNewestCardPerMinterName = (combinedMap) => {
  // We'll produce an array of the newest card for each minterName, this will be utilized as the 'final filter' to display cards published/updated by unique minters.
  const finalOutput = []

  for (const [mName, cardArray] of combinedMap.entries()) {
    // sort by updated or created, descending => newest first
    cardArray.sort((a, b) => {
      const aTime = a.updated || a.created || 0
      const bTime = b.updated || b.created || 0
      return bTime - aTime
    })
    // newest is [0]
    finalOutput.push(cardArray[0])
  }
  // Then maybe globally sort them newest first
  finalOutput.sort((a, b) => {
    const aTime = a.updated || a.created || 0
    const bTime = b.updated || b.created || 0
    return bTime - aTime
  })

  return finalOutput
}

const processMinterBoardCards = async (allValidCards) => {
  // group by identifier, sorted oldest->newest
  const mapById = groupByIdentifierOldestFirst(allValidCards)
  // build a map of minterName => all cards from those identifiers
  const minterNameMap = await buildMinterNameGroups(mapById)
  // from that map, keep only the single newest card per minterName
  const newestCards = getNewestCardPerMinterName(minterNameMap)
  // return final array of all newest cards
  return newestCards
}

const processARBoardCards = async (allValidCards) => {
  const mapById = groupByIdentifierOldestFirst(allValidCards)
  // build a map of minterName => all cards from those identifiers
  const mapByName = await buildMinterNameGroups(mapById)
  // For each minterName group, we might want to sort them newest->oldest
  const finalOutput = []
  for (const [minterName, group] of mapByName.entries()) {
    group.sort((a, b) => {
      const aTime = a.updated || a.created || 0
      const bTime = b.updated || b.created || 0
      return bTime - aTime
    })
    // both resolution for the duplicate QuickMythril card, and handling of all future duplicates that may be published...
    if (group[0].identifier === 'QM-AR-card-Xw3dxL') {
      console.warn(`This is a bug that allowed a duplicate prior to the logic displaying them based on original publisher only... displaying in reverse order...`)
      group[0].isDuplicate = true
      for (let i = 1; i < group.length; i++) {
        group[i].isDuplicate = false
      } 
    }else {
      group[0].isDuplicate = false
      for (let i = 1; i < group.length; i++) {
        group[i].isDuplicate = true
      }
    }
    // push them all
    finalOutput.push(...group)
  }
  // Sort final by newest overall
  finalOutput.sort((a, b) => {
    const aTime = a.updated || a.created || 0
    const bTime = b.updated || b.created || 0
    return bTime - aTime
  })

  return finalOutput
}

//Main function to load the Minter Cards ----------------------------------------
const loadCards = async (cardIdentifierPrefix) => {
  const cardsContainer = document.getElementById("cards-container")
  let isARBoard = false
  cardsContainer.innerHTML = "<p>Loading cards...</p>"
  const counterSpan = document.getElementById("board-card-counter")

  if (counterSpan) {
    // Clear or show "Loading..."
    counterSpan.textContent = "(loading...)"
  }

  if (cardIdentifierPrefix.startsWith("QM-AR-card")) {
    isARBoard = true
    console.warn(`ARBoard determined:`, isARBoard)
  }
  let afterTime = 0
  const timeRangeSelect = document.getElementById("time-range-select")

  const showExistingCheckbox = document.getElementById("show-existing-checkbox")
  const showExisting = showExistingCheckbox && showExistingCheckbox.checked

  if (timeRangeSelect) {
    const days = parseInt(timeRangeSelect.value, 10)
    if (days > 0) {
      const now = Date.now()
      const dayMs = 24 * 60 * 60 * 1000
      afterTime = now - days * dayMs  // e.g. last X days
      console.log(`afterTime for last ${days} days = ${new Date(afterTime).toLocaleString()}`)
    }
  }

  try {
    // 1) Fetch raw "BLOG_POST" entries
    const response = await searchSimple('BLOG_POST', cardIdentifierPrefix, '', 0, 0, '', false, true, afterTime)

    if (!response || !Array.isArray(response) || response.length === 0) {
      cardsContainer.innerHTML = "<p>No cards found.</p>"
      return
    }
    // 2) Validate structure
    const validatedCards = await Promise.all(
      response.map(async (card) => {
        const isValid = await validateCardStructure(card)
        return isValid ? card : null
      })
    )
    const validCards = validatedCards.filter((card) => card !== null)

    if (validCards.length === 0) {
      cardsContainer.innerHTML = "<p>No valid cards found.</p>"
      return
    }
    // Additional logic for ARBoard or MinterCards
    const finalCards = isARBoard
      ? await processARBoardCards(validCards)
      : await processMinterBoardCards(validCards)

    // Sort finalCards according to selectedSort
    let selectedSort = 'newest'
    const sortSelect = document.getElementById('sort-select')
    if (sortSelect) {
      selectedSort = sortSelect.value
    }

    if (selectedSort === 'name') {
      finalCards.sort((a, b) => {
        const nameA = a.name?.toLowerCase() || ''
        const nameB = b.name?.toLowerCase() || ''
        return nameA.localeCompare(nameB)
      })
    } else if (selectedSort === 'recent-comments') {
      // If you need the newest comment timestamp
      for (let card of finalCards) {
        card.newestCommentTimestamp = await getNewestCommentTimestamp(card.identifier)
      }
      finalCards.sort((a, b) =>
        (b.newestCommentTimestamp || 0) - (a.newestCommentTimestamp || 0)
      )
    } else if (selectedSort === 'least-votes') {
      await applyVoteSortingData(finalCards, /* ascending= */ true)
    } else if (selectedSort === 'most-votes') {
      await applyVoteSortingData(finalCards, /* ascending= */ false)
    }
    // else 'newest' => do nothing (already sorted newest-first by your process functions).
    // Create the 'finalCardsArray' that includes the data, etc.
    let finalCardsArray = []
    let alreadyMinterCards = []
    cardsContainer.innerHTML = ''
    for (const card of finalCards) {
      try {
        const skeletonHTML = createSkeletonCardHTML(card.identifier)
        cardsContainer.insertAdjacentHTML("beforeend", skeletonHTML)
        const cardDataResponse = await qortalRequest({
          action: "FETCH_QDN_RESOURCE",
          name: card.name,
          service: "BLOG_POST",
          identifier: card.identifier
        })

        if (!cardDataResponse || !cardDataResponse.poll) {
          // skip
          console.warn(`Skipping card: missing data/poll. identifier=${card.identifier}`)
          removeSkeleton(card.identifier)
          continue
        }
        // Extra validation: check poll ownership matches card publisher
        const pollPublisherAddress = await getPollOwnerAddress(cardDataResponse.poll)
        const cardPublisherAddress = await fetchOwnerAddressFromName(card.name)
        if (pollPublisherAddress !== cardPublisherAddress) {
          console.warn(`Poll hijack attack found, discarding card ${card.identifier}`)
          removeSkeleton(card.identifier)
          continue
        }
        // If ARBoard, do a quick address check
        if (isARBoard) {
          const ok = await verifyMinter(cardDataResponse.minterName)
          if (!ok) {
            console.warn(`Card is not a minter nor an admin, not including in ARBoard. identifier: ${card.identifier}`)
            removeSkeleton(card.identifier)
            continue
          }
        } else {
          const isAlreadyMinter = await verifyMinter(cardDataResponse.creator)
          if (isAlreadyMinter) {
            console.warn(`card IS ALREADY a minter, adding to alreadyMinterCards array: ${card.identifier}`)
            removeSkeleton(card.identifier)
            alreadyMinterCards.push({
              ...card,
              cardDataResponse,
              pollPublisherAddress,
              cardPublisherAddress
            })
            continue
          }
        }
        // **Push** to finalCardsArray for further processing (duplicates, etc.)
        finalCardsArray.push({
          ...card,
          cardDataResponse,
          pollPublisherAddress,
          cardPublisherAddress,
        })
        if (counterSpan) {
          const displayedCount = finalCardsArray.length
          const alreadyMinterCount = alreadyMinterCards.length
          // If you want to show both
          counterSpan.textContent = `(${displayedCount} cards, ${alreadyMinterCount} existingMinters)`
        }
      } catch (err) {
        console.error(`Error preparing card ${card.identifier}`, err)
        removeSkeleton(card.identifier)
      }
    }

    // Next, do the actual rendering:
    // cardsContainer.innerHTML = ""
    for (const cardObj of finalCardsArray) {
      // Insert a skeleton first if you like
      // const skeletonHTML = createSkeletonCardHTML(cardObj.identifier)
      // cardsContainer.insertAdjacentHTML("beforeend", skeletonHTML)
      // Build final HTML
      const pollResults = await fetchPollResults(cardObj.cardDataResponse.poll)
      const commentCount = await countComments(cardObj.identifier)
      const cardUpdatedTime = cardObj.updated || null
      const bgColor = generateDarkPastelBackgroundBy(cardObj.name)
      // Construct the final HTML for each card
      const finalCardHTML = isARBoard
        ? await createARCardHTML(
            cardObj.cardDataResponse,
            pollResults,
            cardObj.identifier,
            commentCount,
            cardUpdatedTime,
            bgColor,
            cardObj.cardPublisherAddress,
            cardObj.isDuplicate
          )
        : await createCardHTML(
            cardObj.cardDataResponse,
            pollResults,
            cardObj.identifier,
            commentCount,
            cardUpdatedTime,
            bgColor,
            cardObj.cardPublisherAddress
          )

      replaceSkeleton(cardObj.identifier, finalCardHTML)
    }

    if (showExisting && alreadyMinterCards.length > 0) {
      console.warn(`Rendering Existing Minter cards because user selected showExisting`)

      for (const mintedCardObj of alreadyMinterCards) {
        const skeletonHTML = createSkeletonCardHTML(mintedCardObj.identifier)
        cardsContainer.insertAdjacentHTML("beforeend", skeletonHTML)

        const pollResults = await fetchPollResults(mintedCardObj.cardDataResponse.poll)
        const commentCount = await countComments(mintedCardObj.identifier)
        const cardUpdatedTime = mintedCardObj.updated || null
        const bgColor = generateDarkPastelBackgroundBy(mintedCardObj.name)
        const isExistingMinter = true

        const finalCardHTML = await createCardHTML(
          mintedCardObj.cardDataResponse,
          pollResults,
          mintedCardObj.identifier,
          commentCount,
          cardUpdatedTime,
          bgColor,
          mintedCardObj.cardPublisherAddress,
          isExistingMinter
        )
        replaceSkeleton(mintedCardObj.identifier, finalCardHTML)
      }
    }

  } catch (error) {
    console.error("Error loading cards:", error)
    cardsContainer.innerHTML = "<p>Failed to load cards.</p>"
    if (counterSpan) {
      counterSpan.textContent = "(error loading)"
    }
  }
}

const verifyMinter = async (minterName) => {
  try {
    const nameInfo = await getNameInfo(minterName)

    if (!nameInfo) return false
    const minterAddress = nameInfo.owner
    const isValid = await getAddressInfo(minterAddress)

    if (!isValid) return false
    // Then check if they're in the minter group
    const minterGroup = await fetchMinterGroupMembers()
    const adminGroup = await fetchMinterGroupAdmins()
    const minterGroupAddresses = minterGroup.map(m => m.member)
    const adminGroupAddresses = adminGroup.map(m => m.member)

    return (minterGroupAddresses.includes(minterAddress) ||
            adminGroupAddresses.includes(minterAddress))
  } catch (err) {
    console.warn("verifyMinter error:", err)
    return false
  }
}

const applyVoteSortingData = async (cards, ascending = true) => {
  const minterGroupMembers = await fetchMinterGroupMembers()
  const minterAdmins = await fetchMinterGroupAdmins()

  for (const card of cards) {
    try {
      const cardDataResponse = await qortalRequest({
        action: "FETCH_QDN_RESOURCE",
        name: card.name,
        service: "BLOG_POST",
        identifier: card.identifier,
      })
      if (!cardDataResponse || !cardDataResponse.poll) {
        card._adminVotes = 0
        card._adminYes = 0
        card._minterVotes = 0
        card._minterYes = 0
        continue
      }
      const pollResults = await fetchPollResults(cardDataResponse.poll);
      const { adminYes, adminNo, minterYes, minterNo } = await processPollData(
        pollResults,
        minterGroupMembers,
        minterAdmins,
        cardDataResponse.creator,
        card.identifier
      )
      card._adminVotes = adminYes + adminNo
      card._adminYes = adminYes
      card._minterVotes = minterYes + minterNo
      card._minterYes = minterYes
    } catch (error) {
      console.warn(`Error fetching or processing poll for card ${card.identifier}:`, error)
      card._adminVotes = 0
      card._adminYes = 0
      card._minterVotes = 0
      card._minterYes = 0
    }
  }

  if (ascending) {
    // least votes first
    cards.sort((a, b) => {
      const diffAdminTotal = a._adminVotes - b._adminVotes
      if (diffAdminTotal !== 0) return diffAdminTotal
      const diffAdminYes = a._adminYes - b._adminYes
      if (diffAdminYes !== 0) return diffAdminYes
      const diffMinterTotal = a._minterVotes - b._minterVotes
      if (diffMinterTotal !== 0) return diffMinterTotal
      return a._minterYes - b._minterYes
    })
  } else {
    // most votes first
    cards.sort((a, b) => {
      const diffAdminTotal = b._adminVotes - a._adminVotes
      if (diffAdminTotal !== 0) return diffAdminTotal
      const diffAdminYes = b._adminYes - a._adminYes
      if (diffAdminYes !== 0) return diffAdminYes
      const diffMinterTotal = b._minterVotes - a._minterVotes
      if (diffMinterTotal !== 0) return diffMinterTotal
      return b._minterYes - a._minterYes
    })
  }
}

const removeSkeleton = (cardIdentifier) => {
  const skeletonCard = document.getElementById(`skeleton-${cardIdentifier}`)
  if (skeletonCard) {
    skeletonCard.remove()
  }
}

const replaceSkeleton = (cardIdentifier, htmlContent) => {
  const skeletonCard = document.getElementById(`skeleton-${cardIdentifier}`)
  if (skeletonCard) {
    skeletonCard.outerHTML = htmlContent
  }
}

const createSkeletonCardHTML = (cardIdentifier) => {
  return `
    <div id="skeleton-${cardIdentifier}" class="skeleton-card" style="padding: 10px; border: 1px solid gray; margin: 10px 0;">
      <div style="display: flex; align-items: center;">
        <div><p style="color:rgb(174, 174, 174)">LOADING CARD...</p></div>
        <div style="width: 50px; height: 50px; background-color: #ccc; border-radius: 50%;"></div>
        <div style="margin-left: 10px;">
          <div style="width: 120px; height: 20px; background-color: #ccc; margin-bottom: 5px;"></div>
          <div style="width: 80px; height: 15px; background-color: #ddd;"></div>
        </div>
      </div>
      <div style="margin-top: 10px;">
        <div style="width: 100%; height: 80px; background-color: #eee; color:rgb(17, 24, 28); padding: 0.22vh"><p>PLEASE BE PATIENT</p><p style="color: #11121c"> While data loads from QDN...</div>
      </div>
    </div>
  `
}

// Function to check and fech an existing Minter Card if attempting to publish twice ----------------------------------------
const fetchExistingCard = async (cardIdentifierPrefix) => {
  try {
    const response = await searchSimple('BLOG_POST', `${cardIdentifierPrefix}`, `${userState.accountName}`, 0, 0, '', true)

    console.log(`SEARCH_QDN_RESOURCES response: ${JSON.stringify(response, null, 2)}`)

    if (!response || !Array.isArray(response) || response.length === 0) {
      console.log("No cards found for the current user.")
      return null
    } else if (response.length === 1) { // we don't need to go through all of the rest of the checks and filtering nonsense if there's only a single result, just return it.
      const mostRecentCard =  response[0]
      isExistingCard = true
      const cardDataResponse = await qortalRequest({
        action: "FETCH_QDN_RESOURCE",
        name: userState.accountName, // User's account name
        service: "BLOG_POST",
        identifier: mostRecentCard.identifier
      })
      existingCardIdentifier = mostRecentCard.identifier
      existingCardData = cardDataResponse
      isExistingCard = true

      return cardDataResponse
    }

    const validatedCards = await Promise.all(
      response.map(async card => {
        const isValid = await validateCardStructure(card)
        return isValid ? card : null
      })
    )

    const validCards = validatedCards.filter(card => card !== null)

    if (validCards.length > 0) {

      const mostRecentCard = validCards.sort((a, b) => b.created - a.created)[0]

      const cardDataResponse = await qortalRequest({
        action: "FETCH_QDN_RESOURCE",
        name: userState.accountName, // User's account name
        service: "BLOG_POST",
        identifier: mostRecentCard.identifier
      })

      existingCardIdentifier = mostRecentCard.identifier
      existingCardData = cardDataResponse
      isExistingCard = true

      console.log("Full card data fetched successfully:", cardDataResponse)

      return cardDataResponse
    }

    console.log("No valid cards found.")
    return null
  } catch (error) {
    console.error("Error fetching existing card:", error)
    return null
  }
}

// Validate that a card is indeed a card and not a comment. -------------------------------------
const validateCardStructure = async (card) => {
  return (
    typeof card === "object" &&
    card.name &&
    card.service === "BLOG_POST" &&
    card.identifier && !card.identifier.includes("comment") &&
    card.created
  )
}

// Load existing card data passed, into the form for editing -------------------------------------
const loadCardIntoForm = async (cardData) => {
  console.log("Loading existing card data:", cardData)
  document.getElementById("card-header").value = cardData.header
  document.getElementById("card-content").value = cardData.content

  const linksContainer = document.getElementById("links-container")
  linksContainer.innerHTML = ""
  cardData.links.forEach(link => {
    const linkInput = document.createElement("input")
    linkInput.type = "text"
    linkInput.className = "card-link"
    linkInput.value = link;
    linksContainer.appendChild(linkInput)
  })
}

// Main function to publish a new Minter Card -----------------------------------------------
const publishCard = async (cardIdentifierPrefix) => {
  const minterGroupData = await fetchMinterGroupMembers()
  const minterGroupAddresses = minterGroupData.map(m => m.member)
  const userAddress = userState.accountAddress

  if (minterGroupAddresses.includes(userAddress)) {
    alert("You are already a Minter and cannot publish a new card!")
    return
  }

  const header = document.getElementById("card-header").value.trim()
  const content = document.getElementById("card-content").value.trim()
  const links = Array.from(document.querySelectorAll(".card-link"))
    .map(input => input.value.trim())
    .filter(link => link.startsWith("qortal://"))

  if (!header || !content) {
    alert("Header and content are required!")
    return
  }

  if (isExistingCard) {
    if (!existingCardData || Object.keys(existingCardData).length === 0) {
      const fetched = await fetchExistingCard(cardIdentifierPrefix) 
      if (fetched) {
        existingCardData = fetched
      } else {
        console.warn("fetchExistingCard returned null. Possibly no existing card found.")
      }
    }
  }

  const cardIdentifier = isExistingCard && existingCardIdentifier
    ? existingCardIdentifier
    : `${cardIdentifierPrefix}-${await uid()}`

  let existingPollName
  if (existingCardData && existingCardData.poll) {
    existingPollName = existingCardData.poll
  }

  const pollName = existingPollName || `${cardIdentifier}-poll`
  const pollDescription = `Mintership Board Poll for ${userState.accountName}`

  const cardData = {
    header,
    content,
    links,
    creator: userState.accountName,
    creatorAddress: userState.accountAddress,
    timestamp: Date.now(),
    poll: pollName // either the existing poll or a new one
  }

  try {
    let base64CardData = await objectToBase64(cardData)
    if (!base64CardData) {
      console.log(`initial base64 object creation with objectToBase64 failed, using btoa...`)
      base64CardData = btoa(JSON.stringify(cardData))
    }

    await qortalRequest({
      action: "PUBLISH_QDN_RESOURCE",
      name: userState.accountName,
      service: "BLOG_POST",
      identifier: cardIdentifier,
      data64: base64CardData,
    })

    if (!isExistingCard || !existingPollName) {
      await qortalRequest({
        action: "CREATE_POLL",
        pollName,
        pollDescription,
        pollOptions: ['Yes, No'],
        pollOwnerAddress: userState.accountAddress,
      })
      if (!isExistingCard) {
        alert("Card and poll published successfully!")
      } else {
        alert("Existing card updated, and new poll created (since existing poll was missing)!")
      }
    } else {
      alert("Card updated successfully! (No poll updates possible)")
    }

    if (isExistingCard) {
      isExistingCard = false
      existingCardData = {}
    }

    document.getElementById("publish-card-form").reset()
    document.getElementById("publish-card-view").style.display = "none"
    document.getElementById("cards-container").style.display = "flex"

    await loadCards(minterCardIdentifierPrefix)

  } catch (error) {
    console.error("Error publishing card or poll:", error)
    alert("Failed to publish card and poll.")
  }
}


let globalVoterMap = new Map()

const processPollData= async (pollData, minterGroupMembers, minterAdmins, creator, cardIdentifier) => {
  if (!pollData || !Array.isArray(pollData.voteWeights) || !Array.isArray(pollData.votes)) {
    console.warn("Poll data is missing or invalid. pollData:", pollData)
    return {
      adminYes: 0,
      adminNo: 0,
      minterYes: 0,
      minterNo: 0,
      totalYes: 0,
      totalNo: 0,
      totalYesWeight: 0,
      totalNoWeight: 0,
      detailsHtml: `<p>Poll data is invalid or missing.</p>`,
      userVote: null
    }
  }

  const memberAddresses = minterGroupMembers.map(m => m.member)
  const minterAdminAddresses = minterAdmins.map(m => m.member)
  const adminGroupsMembers = await fetchAllAdminGroupsMembers()
  const featureTriggerPassed = await featureTriggerCheck()
  const groupAdminAddresses = adminGroupsMembers.map(m => m.member)
  let adminAddresses = [...minterAdminAddresses]

  if (!featureTriggerPassed) {
    console.log(`featureTrigger is NOT passed, only showing admin results from Minter Admins and Group Admins`)
    adminAddresses = [...minterAdminAddresses, ...groupAdminAddresses]
  }
  
  let adminYes = 0, adminNo = 0
  let minterYes = 0, minterNo = 0
  let yesWeight = 0, noWeight = 0
  let userVote = null

  for (const w of pollData.voteWeights) {
    if (w.optionName.toLowerCase() === 'yes') {
      yesWeight = w.voteWeight
    } else if (w.optionName.toLowerCase() === 'no') {
      noWeight = w.voteWeight
    }
  }

  const voterPromises = pollData.votes.map(async (vote) => {
    const optionIndex = vote.optionIndex; // 0 => yes, 1 => no
    const voterPublicKey = vote.voterPublicKey
    const voterAddress = await getAddressFromPublicKey(voterPublicKey)

    if (voterAddress === userState.accountAddress) {
      userVote = optionIndex
    }

    if (optionIndex === 0) {
      if (adminAddresses.includes(voterAddress)) {
        adminYes++
      } else if (memberAddresses.includes(voterAddress)) {
        minterYes++
      } else {
        console.log(`voter ${voterAddress} is not a minter nor an admin... Not included in aggregates.`)
      }
    } else if (optionIndex === 1) {
      if (adminAddresses.includes(voterAddress)) {
        adminNo++
      } else if (memberAddresses.includes(voterAddress)) {
        minterNo++
      } else {
        console.log(`voter ${voterAddress} is not a minter nor an admin... Not included in aggregates.`)
      }
    }

    let voterName = ''
    try {
      const nameInfo = await getNameFromAddress(voterAddress)
      if (nameInfo) {
        voterName = nameInfo
        if (nameInfo === voterAddress) voterName = ''
      }
    } catch (err) {
      console.warn(`No name for address ${voterAddress}`, err)
    }

    let blocksMinted = 0
    try {
      const addressInfo = await getAddressInfo(voterAddress)
      blocksMinted = addressInfo?.blocksMinted || 0
    } catch (e) {
      console.warn(`Failed to get addressInfo for ${voterAddress}`, e)
    }
    const isAdmin = adminAddresses.includes(voterAddress)
    const isMinter = memberAddresses.includes(voterAddress)
    
    return {
      optionIndex,
      voterPublicKey,
      voterAddress,
      voterName,
      isAdmin,
      isMinter,
      blocksMinted
    }
  })

  const allVoters = await Promise.all(voterPromises)
  const yesVoters = []
  const noVoters = []
  let totalMinterAndAdminYesWeight = 0
  let totalMinterAndAdminNoWeight = 0

  for (const v of allVoters) {
    if (v.optionIndex === 0) {
      yesVoters.push(v)
      totalMinterAndAdminYesWeight+=v.blocksMinted
    } else if (v.optionIndex === 1) {
      noVoters.push(v)
      totalMinterAndAdminNoWeight+=v.blocksMinted
    }
  }

  yesVoters.sort((a,b) => b.blocksMinted - a.blocksMinted)
  noVoters.sort((a,b) => b.blocksMinted - a.blocksMinted)
  const sortedAllVoters = allVoters.sort((a,b) => b.blocksMinted - a.blocksMinted)
  await createVoterMap(sortedAllVoters, cardIdentifier)

  const yesTableHtml = buildVotersTableHtml(yesVoters, /* tableColor= */ "green")
  const noTableHtml = buildVotersTableHtml(noVoters, /* tableColor= */ "red")
  const detailsHtml = `
    <div class="poll-details-container" id'"${creator}-poll-details">
      <h1 style ="color:rgb(123, 123, 85); text-align: center; font-size: 2.0rem">${creator}'s</h1><h3 style="color: white; text-align: center; font-size: 1.8rem"> Support Poll Result Details</h3>
      <h4 style="color: green; text-align: center;">Yes Vote Details</h4>
      ${yesTableHtml}
      <h4 style="color: red; text-align: center; margin-top: 2em;">No Vote Details</h4>
      ${noTableHtml}
    </div>
  `
  const totalYes = adminYes + minterYes
  const totalNo = adminNo + minterNo

  return {
    adminYes,
    adminNo,
    minterYes,
    minterNo,
    totalYes,
    totalNo,
    totalYesWeight: totalMinterAndAdminYesWeight,
    totalNoWeight: totalMinterAndAdminNoWeight,
    detailsHtml,
    userVote
  }
}

const createVoterMap = async (voters, cardIdentifier) => {
  const voterMap = new Map()
  voters.forEach((voter) => {
    const voterNameOrAddress = voter.voterName || voter.voterAddress
    voterMap.set(voterNameOrAddress, {
      vote: voter.optionIndex === 0 ? "yes" : "no", // Use optionIndex directly
      voterType: voter.isAdmin ? "Admin" : voter.isMinter ? "Minter" : "User",
      blocksMinted: voter.blocksMinted,
    })
  })
  globalVoterMap.set(cardIdentifier, voterMap)
}

const buildVotersTableHtml = (voters, tableColor) => {
  if (!voters.length) {
    return `<p>No voters here.</p>`
  }

  // Decide extremely dark background for the <tbody>
  let bodyBackground
  if (tableColor === "green") {
    bodyBackground = "rgba(0, 18, 0, 0.8)" // near-black green
  } else if (tableColor === "red") {
    bodyBackground = "rgba(30, 0, 0, 0.8)" // near-black red
  } else {
    // fallback color if needed
    bodyBackground = "rgba(40, 20, 10, 0.8)"
  }

  // tableColor is used for the <thead>, bodyBackground for the <tbody>
  const minterColor = 'rgb(98, 122, 167)'
  const adminColor = 'rgb(44, 209, 151)'
  const userColor = 'rgb(102, 102, 102)'
  return `
    <table style="
      width: 100%;
      border-style: dotted;
      border-width: 0.15rem;
      border-color: #576b6f;
      margin-bottom: 1em;
      border-collapse: collapse;
    ">
      <thead style="background: ${tableColor}; color:rgb(238, 238, 238) ;">
        <tr style="font-size: 1.5rem;">
          <th style="padding: 0.1rem; text-align: center;">Voter Name/Address</th>
          <th style="padding: 0.1rem; text-align: center;">Voter Type</th>
          <th style="padding: 0.1rem; text-align: center;">Voter Weight(=BlocksMinted)</th>
        </tr>
      </thead>

      <!-- Tbody with extremely dark green or red -->
      <tbody style="background-color: ${bodyBackground}; color: #c6c6c6;">
        ${voters
          .map(v => {
            const userType = v.isAdmin ? "Admin" : v.isMinter ? "Minter" : "User"
            const pollName = v.pollName
            const displayName =
              v.voterName
                ? v.voterName
                : v.voterAddress
            return `
              <tr style="font-size: 1.2rem; border-width: 0.1rem; border-style: dotted; border-color: lightgrey; font-weight: bold;">
                <td style="padding: 1.2rem; border-width: 0.1rem; border-style: dotted; border-color: lightgrey; text-align: center; 
                color:${userType === 'Admin' ? adminColor : v.isMinter? minterColor : userColor };">${displayName}</td>
                <td style="padding: 1.2rem; border-width: 0.1rem; border-style: dotted; border-color: lightgrey; text-align: center; 
                color:${userType === 'Admin' ? adminColor : v.isMinter? minterColor : userColor };">${userType}</td>
                <td style="padding: 1.2rem; border-width: 0.1rem; border-style: dotted; border-color: lightgrey; text-align: center; 
                color:${userType === 'Admin' ? adminColor : v.isMinter? minterColor : userColor };">${v.blocksMinted}</td>
              </tr>
            `
          })
          .join("")}
      </tbody>
    </table>
  `
}


// Post a comment on a card. --------------------------------- 
const postComment = async (cardIdentifier) => {
  const commentInput = document.getElementById(`new-comment-${cardIdentifier}`)
  const commentText = commentInput.value.trim()

  if (!commentText) {
    alert('Comment cannot be empty!')
    return
  }

  try {
    //Ensure the user is not on the blockList prior to allowing them to publish a comment. 
    const blockedNames = await fetchBlockList()
    
    if (blockedNames.includes(userState.accountName)) {
      alert('You are on the block list and cannot publish comments.')
      return
    }
    const commentData = {
      content: commentText,
      creator: userState.accountName,
      timestamp: Date.now(),
    }
    const uniqueCommentIdentifier = `comment-${cardIdentifier}-${await uid()}`
    let base64CommentData = await objectToBase64(commentData)
    if (!base64CommentData) {
      console.log('objectToBase64 failed, fallback to btoa()')
      base64CommentData = btoa(JSON.stringify(commentData))
    }

    await qortalRequest({
      action: 'PUBLISH_QDN_RESOURCE',
      name: userState.accountName,
      service: 'BLOG_POST',
      identifier: uniqueCommentIdentifier,
      data64: base64CommentData,
    })

    commentInput.value = ''

  } catch (error) {
    console.error('Error posting comment:', error)
    alert('Failed to post comment. Error: ' + error)
  }
}


//Fetch the comments for a card with passed card identifier ----------------------------
const fetchCommentsForCard = async (cardIdentifier) => {
  try {
    const response = await searchSimple('BLOG_POST',`comment-${cardIdentifier}`, '', 0, 0, '', 'false')
    return response
  } catch (error) {
    console.error(`Error fetching comments for ${cardIdentifier}:`, error)
    return []
  }
}

const displayComments = async (cardIdentifier) => {
  try {
    const comments = await fetchCommentsForCard(cardIdentifier)
    const commentsContainer = document.getElementById(`comments-container-${cardIdentifier}`)
    commentsContainer.innerHTML = ""
    const blockedNames = await fetchBlockList()
    console.log("Loaded block list:", blockedNames)
    const voterMap = globalVoterMap.get(cardIdentifier) || new Map()

    const commentHTMLArray = await Promise.all(
      comments.map(async (comment) => {
        try {
          const commentDataResponse = await qortalRequest({
            action: "FETCH_QDN_RESOURCE",
            name: comment.name,
            service: "BLOG_POST",
            identifier: comment.identifier
          })

          if (!commentDataResponse || !commentDataResponse.creator) {
            return null
          }
          const commenterName = commentDataResponse.creator
          const voterInfo = voterMap.get(commenterName)
          let commentColor = "transparent"
          let adminBadge = ""

          if (blockedNames.includes(commenterName)) {
            console.warn(`Skipping blocked commenter: ${commenterName}`)
            return null
          }

          if (voterInfo) {
            if (voterInfo.voterType === "Admin") {
            
              commentColor = voterInfo.vote === "yes" ? "rgba(21, 150, 21, 0.6)" : "rgba(212, 37, 64, 0.6)" // Light green for yes, light red for no
              const badgeColor = voterInfo.vote === "yes" ? "rgb(206, 195, 77)" : "rgb(121, 119, 90)"
              adminBadge = `<span style="color: ${badgeColor}; font-weight: bold; margin-left: 0.5em;">(Admin)</span>`
            } else {

              commentColor = voterInfo.vote === "yes" ? "rgba(0, 100, 0, 0.3)" : "rgba(100, 0, 0, 0.3)" // Darker green for yes, darker red for no
            }
          }
          const timestamp = new Date(commentDataResponse.timestamp).toLocaleString()
          return `
            <div class="comment" style="border: 1px solid gray; margin: 1vh 0; padding: 1vh; background: ${commentColor};">
              <p>
                <strong>${commenterName}</strong>
                ${adminBadge}
              </p>
              <p>${commentDataResponse.content}</p>
              <p><i>${timestamp}</i></p>
            </div>
          `
        } catch (err) {
          console.error(`Error with comment ${comment.identifier}:`, err)
          return null
        }
      })
    )
    commentHTMLArray
      .filter(html => html !== null)
      .forEach(commentHTML => {
        commentsContainer.insertAdjacentHTML('beforeend', commentHTML)
      })

  } catch (err) {
    console.error(`Error displaying comments for ${cardIdentifier}:`, err)
  }
}


// Toggle comments from being shown or not, with passed cardIdentifier for comments being toggled --------------------
const toggleComments = async (cardIdentifier) => {
  const commentsSection = document.getElementById(`comments-section-${cardIdentifier}`)
  const commentButton = document.getElementById(`comment-button-${cardIdentifier}`)

  if (!commentsSection || !commentButton) return
  
  const count = commentButton.dataset.commentCount
  const isHidden = (commentsSection.style.display === 'none' || !commentsSection.style.display)

  if (isHidden) {
    // Show comments
    commentButton.textContent = "LOADING..."
    await displayComments(cardIdentifier)
    commentsSection.style.display = 'block'
    // Change the button text to 'HIDE COMMENTS'
    commentButton.textContent = 'HIDE COMMENTS'
  } else {
    // Hide comments
    commentsSection.style.display = 'none'
    commentButton.textContent = `COMMENTS (${count})`
  }
}

const countComments = async (cardIdentifier) => {
  try {
    const response = await searchSimple('BLOG_POST', `comment-${cardIdentifier}`, '', 0, 0, '', 'false')
    return Array.isArray(response) ? response.length : 0
  } catch (error) {
    console.error(`Error fetching comment count for ${cardIdentifier}:`, error)
    return 0
  }
}


const createModal = (modalType='') => {
  if (document.getElementById(`${modalType}-modal`)) {
    return
  }
  const isIframe = (modalType === 'links')

  const modalHTML = `
    <div id="${modalType}-modal"
         style="display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.50);
                z-index: 10000;">
      <div id="${modalType}-modalContainer"
           style="position: relative;
                  margin: 10% auto;
                  width: 80%; 
                  height: 70%; 
                  background:rgba(0, 0, 0, 0.80) ;
                  border-radius: 10px;
                  overflow: hidden;">
        ${
          isIframe
            ? `<iframe id="${modalType}-modalContent" 
                       src=""
                       style="width: 100%; height: 100%; border: none;">
               </iframe>`
            : `<div id="${modalType}-modalContent" 
                    style="width: 100%; height: 100%; overflow: auto;">
               </div>`
        }

        <button onclick="closeModal('${modalType}')"
                style="position: absolute; top: 0.2rem; right: 0.2rem;
                       background:rgba(0, 0, 0, 0.66); color: white; border: none;
                       font-size: 2.2rem;
                       padding: 0.4rem 1rem; 
                       border-radius: 0.33rem; 
                       border-style: dashed; 
                       border-color:rgb(213, 224, 225); 
                       "
                onmouseover="this.style.backgroundColor='rgb(73, 7, 7) '"
                onmouseout="this.style.backgroundColor='rgba(5, 14, 11, 0.63) '">
                
          X
        </button>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', modalHTML)
  const modal = document.getElementById(`${modalType}-modal`)

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      closeModal(modalType)
    }
  })
}

const openLinksModal = async (link) => {
  const processedLink = await processLink(link)
  const modal = document.getElementById('links-modal')
  const modalContent = document.getElementById('links-modalContent')
  modalContent.src = processedLink
  modal.style.display = 'block'
}

const closeModal = async (modalType='links') => {
  const modal = document.getElementById(`${modalType}-modal`)
  const modalContent = document.getElementById(`${modalType}-modalContent`)
  if (modal) {
    modal.style.display = 'none'
  }
  if (modalContent) {
    modalContent.src = ''
  }
}

const processLink = async (link) => {
  if (link.startsWith('qortal://')) {
    const match = link.match(/^qortal:\/\/([^/]+)(\/.*)?$/)
    if (match) {
      const firstParam = match[1].toUpperCase()
      const remainingPath = match[2] || ""
      const themeColor = window._qdnTheme || 'default'

      await new Promise(resolve => setTimeout(resolve, 10))

      return `/render/${firstParam}${remainingPath}?theme=${themeColor}`
    }
  }
  return link
}

const togglePollDetails = (cardIdentifier) => {  
  const detailsDiv = document.getElementById(`poll-details-${cardIdentifier}`)
  const modal = document.getElementById(`poll-details-modal`)
  const modalContent = document.getElementById(`poll-details-modalContent`)
  
  if (!detailsDiv || !modal || !modalContent) return

  modalContent.innerHTML = detailsDiv.innerHTML
  modal.style.display = 'block'

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = 'none'
    }
  }
}

const generateDarkPastelBackgroundBy = (name) => {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  const safeHash = Math.abs(hash)
  const hueSteps = 69.69 
  const hueIndex = safeHash % hueSteps 
  const hueRange = 288
  const hue = 140 + (hueIndex * (hueRange / hueSteps))

  const satSteps = 13.69
  const satIndex = safeHash % satSteps
  const saturation = 18 + (satIndex * 1.333)

  const lightSteps = 3.69
  const lightIndex = safeHash % lightSteps
  const lightness = 7 + lightIndex

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

const handleInviteMinter = async (minterName) => {
  try {
    const blockInfo = await getLatestBlockInfo()
    const blockHeight = blockInfo.height
    const minterAccountInfo = await getNameInfo(minterName)
    const minterAddress = await minterAccountInfo.owner
    let adminPublicKey 
    let txGroupId
    if (blockHeight >= GROUP_APPROVAL_FEATURE_TRIGGER_HEIGHT){
      if (userState.isMinterAdmin){
        adminPublicKey = await getPublicKeyByName(userState.accountName)
        txGroupId = 694
      }else{
        console.warn(`user is not a minter admin, cannot create invite!`)
        return
      }
    }else {
      adminPublicKey = await getPublicKeyByName(userState.accountName)
      txGroupId = 0
    }
    const fee = 0.01
    const timeToLive = 864000

    console.log(`about to attempt group invite, minterAddress: ${minterAddress}, adminPublicKey: ${adminPublicKey}`)
    const inviteTransaction = await createGroupInviteTransaction(minterAddress, adminPublicKey, 694, minterAddress, timeToLive, txGroupId, fee)
    
    const signedTransaction = await qortalRequest({
        action: "SIGN_TRANSACTION",
        unsignedBytes: inviteTransaction
    })

    console.warn(`signed transaction`,signedTransaction)
    const processResponse = await processTransaction(signedTransaction)

    if (typeof processResponse === 'object') {
      // The successful object might have a "signature" or "type" or "approvalStatus"
      console.log("Invite transaction success object:", processResponse)
      alert(`${minterName} has been successfully invited! Wait for confirmation...Transaction Response: ${JSON.stringify(processResponse)}`)
    } else {
      // fallback string or something
      console.log("Invite transaction raw text response:", processResponse)
      alert(`Invite transaction response: ${JSON.stringify(processResponse)}`)
    }

  } catch (error) {
      console.error("Error inviting minter:", error)
      alert("Error inviting minter. Please try again.")
  }
}

const escapeHTML = (str) => {
  return str
    .replace(/'/g, '&#39;')
    .replace(/"/g, '&quot;')
}

const createInviteButtonHtml = (creator, cardIdentifier) => {
  const escapedCreator = escapeHTML(creator)
  return `
      <div id="invite-button-container-${cardIdentifier}" style="margin-top: 1em;">
          <button onclick="handleInviteMinter('${escapedCreator}')"
                  style="padding: 10px; background:rgb(0, 109, 76) ; color: white; border: dotted; border-color: white; cursor: pointer; border-radius: 5px;"
                  onmouseover="this.style.backgroundColor='rgb(25, 47, 39) '"
                  onmouseout="this.style.backgroundColor='rgba(7, 122, 101, 0.63) '"
                  >
              Create Minter Invite
          </button>
      </div>
  `
}

const featureTriggerCheck = async () => {
  const latestBlockInfo = await getLatestBlockInfo()
  const isBlockPassed = latestBlockInfo.height >= GROUP_APPROVAL_FEATURE_TRIGGER_HEIGHT
  if (isBlockPassed) {
    console.warn(`featureTrigger check (verifyFeatureTrigger) determined block has PASSED:`, isBlockPassed)
    featureTriggerPassed = true
    return true
  } else {
    console.warn(`featureTrigger check (verifyFeatureTrigger) determined block has NOT PASSED:`, isBlockPassed)
    featureTriggerPassed = false
    return false
  }
}

const checkAndDisplayInviteButton = async (adminYes, creator, cardIdentifier) => {
  const isSomeTypaAdmin = userState.isAdmin || userState.isMinterAdmin
  const isBlockPassed = await featureTriggerCheck()
  const minterAdmins = await fetchMinterGroupAdmins()

  // default needed admin count = 9, or 40% if block has passed
  let minAdminCount = 9
  if (isBlockPassed) {
    minAdminCount = Math.ceil(minterAdmins.length * 0.4)
    console.warn(`Using 40% => ${minAdminCount}`)
  }

  // if not enough adminYes votes, no invite button
  if (adminYes < minAdminCount) {
    console.warn(`Admin votes not high enough (have=${adminYes}, need=${minAdminCount}). No button.`)
    return null
  }
  console.log(`passed initial button creation checks (adminYes >= ${minAdminCount})`)
  // get user's address from 'creator' name
  const minterNameInfo = await getNameInfo(creator)
  if (!minterNameInfo || !minterNameInfo.owner) {
    console.warn(`No valid nameInfo for ${creator}, skipping invite button.`)
    return null
  }
  const minterAddress = minterNameInfo.owner
  // fetch all final KICK/BAN tx
  const { finalKickTxs, finalBanTxs } = await fetchAllKickBanTxData()
  const { finalInviteTxs, pendingInviteTxs } = await fetchAllInviteTransactions()
  // check if there's a KICK or BAN for this user.
  const priorKick = finalKickTxs.some(tx => tx.member === minterAddress)
  const priorBan = finalBanTxs.some(tx => tx.offender === minterAddress)
  const existingInvite = finalInviteTxs.some(tx => tx.invitee === minterAddress)
  const pendingInvite = pendingInviteTxs.some(tx => tx.invitee === minterAddress)
  const priorBanOrKick = (priorBan || priorKick)
  console.warn(`PriorBanOrKick determination for ${minterAddress}:`, priorBanOrKick)

  // build the normal invite button & groupApprovalHtml
  let inviteButtonHtml = ""
  if (existingInvite || pendingInvite){
    console.warn(`There is an EXISTING or PENDING INVITE for this user! No invite button being created... existing: (${existingInvite}, pending: ${pendingInvite})`)
    inviteButtonHtml = ''
  } else {
    inviteButtonHtml = isSomeTypaAdmin ? createInviteButtonHtml(creator, cardIdentifier) : ""
  }
  
  const groupApprovalHtml = await checkGroupApprovalAndCreateButton(minterAddress, cardIdentifier, "GROUP_INVITE")

  // if user had no prior KICK/BAN
  if (!priorBanOrKick) {
    console.log(`No prior kick/ban found, creating invite (or approve) button...`)
    console.warn(`Existing Numbers - adminYes/minAdminCount: ${adminYes}/${minAdminCount}`)

    // if there's already a pending GROUP_INVITE, return that approval button
    if (groupApprovalHtml) {
      console.warn(`groupApprovalCheck found existing groupApproval, returning approval button instead of invite button...`)
      return groupApprovalHtml
    }

    console.warn(`No pending approvals or prior kick/ban found, returning invite button...`)
    return inviteButtonHtml

  } else {
    // priorBanOrKick is true => show both
    console.warn(`Prior kick/ban found! Including BOTH buttons...`)
    return inviteButtonHtml + groupApprovalHtml
  }
}

const findPendingApprovalTxForAddress = async (address, txType, limit = 0, offset = 0) => {
  // 1) Fetch all pending transactions
  const pendingTxs = await searchPendingTransactions(limit, offset, false)
  // if a txType is passed, return the results related to that type, if not, then return any pending tx of the potential types.
  let relevantTypes
  if (txType) {
    relevantTypes = new Set([txType])
  } else {
    relevantTypes = new Set(["GROUP_INVITE", "GROUP_BAN", "GROUP_KICK", "ADD_GROUP_ADMIN", "REMOVE_GROUP_ADMIN"])
  }

  // Filter pending TX for relevant types
  const relevantTxs = pendingTxs.filter((tx) => relevantTypes.has(tx.type))

  const matchedTxs = relevantTxs.filter((tx) => {
    switch (tx.type) {
      case "GROUP_INVITE":
        return tx.invitee === address
      case "GROUP_BAN":
        return tx.offender === address
      case "GROUP_KICK":
        return tx.member === address
      case "ADD_GROUP_ADMIN":
        return tx.member === address
      case "REMOVE_GROUP_ADMIN":
        return tx.admin === address
      default:
        return false
    }
  })
  console.warn(`matchedTxs:`,matchedTxs)
  //Sort oldest→newest by timestamp, so matchedTxs[0] is the oldest
  matchedTxs.sort((a, b) => a.timestamp - b.timestamp)
  return matchedTxs // Array of matching pending transactions
}

const checkGroupApprovalAndCreateButton = async (address, cardIdentifier, transactionType) => {
  // We are going to be verifying that the address isn't already a minter, before showing GROUP_APPROVAL buttons potentially...
  if (transactionType === "GROUP_INVITE") {
    console.log(`This is a GROUP_INVITE check for group approval... Checking that user isn't already a minter...`)
    const minterMembers = await fetchMinterGroupMembers()
    const minterGroupAddresses = minterMembers.map(m => m.member)
    if (minterGroupAddresses.includes(address)) {
      console.warn(`User is already a minter, will not be creating group_approval buttons`)
      return null
    }
  }

  const approvalSearchResults = await searchTransactions({
    txTypes: ['GROUP_APPROVAL'],
    confirmationStatus: 'CONFIRMED',
    limit: 0,
    reverse: false,
    offset: 0,
    startBlock: 1990000,
    blockLimit: 0,
    txGroupId: 0 
  })
  const pendingApprovals = await findPendingApprovalTxForAddress(address, transactionType, 0, 0)
  let isSomeTypaAdmin = userState.isAdmin || userState.isMinterAdmin
  // If no pending transaction found, return null
  if (!pendingApprovals || pendingApprovals.length === 0) {
    console.warn("no pending approval transactions found, returning null...")
    return null
  }
  const txSig = pendingApprovals[0].signature
  // Find the relevant signature. (First approval)
  const relevantApprovals = approvalSearchResults.filter(
    (approvalTx) => approvalTx.pendingSignature === txSig
  )
  const { tableHtml, uniqueApprovalCount } = await buildApprovalTableHtml(
    relevantApprovals,
    getNameFromAddress
  )

  if (transactionType === "GROUP_INVITE" && isSomeTypaAdmin) {
    const approvalButtonHtml = `
      <div style="display: flex; flex-direction: column; margin-top: 1em;">
        <p style="color: rgb(181, 214, 100);">
          Existing ${transactionType} Approvals: ${uniqueApprovalCount}
        </p>
        ${tableHtml}
        <div id="approval-button-container-${cardIdentifier}" style="margin-top: 1em;">
          <button
            style="
              padding: 8px;
              background: rgb(37, 97, 99);
              color: rgb(215, 215, 215);
              border: 1px solid #333;
              border-color: white;
              border-radius: 5px;
              cursor: pointer;
            "
            onmouseover="this.style.backgroundColor='rgb(25, 47, 39)'"
            onmouseout="this.style.backgroundColor='rgb(37, 96, 99)'"
            onclick="handleGroupApproval('${txSig}')"
          >
            Approve Invite Tx
          </button>
        </div>
      </div>
    `
    return approvalButtonHtml
  }
  
  if (transactionType === "GROUP_KICK" && isSomeTypaAdmin) {
    const approvalButtonHtml = `
      <div style="display: flex; flex-direction: column; margin-top: 1em;">
        <p style="color: rgb(199, 100, 64);">
          Existing ${transactionType} Approvals: ${uniqueApprovalCount}
        </p>
        ${tableHtml}
        <div id="approval-button-container-${cardIdentifier}" style="margin-top: 1em;">
          <button
            style="
              padding: 8px;
              background: rgb(119, 91, 21);
              color: rgb(201, 255, 251);
              border: 1px solid #333;
              border-color: rgb(102, 69, 60);
              border-radius: 5px;
              cursor: pointer;
            "
            onmouseover="this.style.backgroundColor='rgb(50, 52, 51)'"
            onmouseout="this.style.backgroundColor='rgb(119, 91, 21)'"
            onclick="handleGroupApproval('${txSig}')"
          >
            Approve Kick Tx
          </button>
        </div>
      </div>
    `
    return approvalButtonHtml
  }
  
  if (transactionType === "GROUP_BAN" && isSomeTypaAdmin) {
    const approvalButtonHtml = `
      <div style="display: flex; flex-direction: column; margin-top: 1em;">
        <p style="color: rgb(189, 40, 40);">
          Existing ${transactionType} Approvals: ${uniqueApprovalCount}
        </p>
        ${tableHtml}
        <div id="approval-button-container-${cardIdentifier}" style="margin-top: 1em;">
          <button
            style="
              padding: 8px;
              background: rgb(54, 7, 7);
              color: rgb(201, 255, 251);
              border: 1px solid #333;
              border-color: rgb(204, 94, 94);
              border-radius: 5px;
              cursor: pointer;
            "
            onmouseover="this.style.backgroundColor='rgb(50, 52, 51)'"
            onmouseout="this.style.backgroundColor='rgb(54, 7, 7)'"
            onclick="handleGroupApproval('${txSig}')"
          >
            Approve Ban Tx
          </button>
        </div>
      </div>
    `
    return approvalButtonHtml
  }
  
  if (transactionType === "ADD_GROUP_ADMIN" && isSomeTypaAdmin) {
    const approvalButtonHtml = `
      <div style="display: flex; flex-direction: column; margin-top: 1em;">
        <p style="color: rgb(40, 144, 189);">
          Existing ${transactionType} Approvals: ${uniqueApprovalCount}
        </p>
        ${tableHtml}
        <div id="approval-button-container-${cardIdentifier}" style="margin-top: 1em;">
          <button
            style="
              padding: 8px;
              background: rgb(8, 71, 69);
              color: rgb(201, 255, 251);
              border: 1px solid #333;
              border-color: rgb(198, 252, 249);
              border-radius: 5px;
              cursor: pointer;
            "
            onmouseover="this.style.backgroundColor='rgb(17, 41, 29)'"
            onmouseout="this.style.backgroundColor='rgb(8, 71, 69)'"
            onclick="handleGroupApproval('${txSig}')"
          >
            Approve Add-Admin Tx
          </button>
        </div>
      </div>
    `
    return approvalButtonHtml
  }
  
  if (transactionType === "REMOVE_GROUP_ADMIN" && isSomeTypaAdmin) {
    const approvalButtonHtml = `
      <div style="display: flex; flex-direction: column; margin-top: 1em;">
        <p style="color: rgb(189, 40, 40);">
          Existing ${transactionType} Approvals: ${uniqueApprovalCount}
        </p>
        ${tableHtml}
        <div id="approval-button-container-${cardIdentifier}" style="margin-top: 1em;">
          <button
            style="
              padding: 8px;
              background: rgb(54, 7, 7);
              color: rgb(201, 255, 251);
              border: 1px solid #333;
              border-color: rgb(204, 94, 94);
              border-radius: 5px;
              cursor: pointer;
            "
            onmouseover="this.style.backgroundColor='rgb(50, 52, 51)'"
            onmouseout="this.style.backgroundColor='rgb(54, 7, 7)'"
            onclick="handleGroupApproval('${txSig}')"
          >
            Approve Remove-Admin Tx
          </button>
        </div>
      </div>
    `
    return approvalButtonHtml
  }
  
}

const buildApprovalTableHtml = async (approvalTxs, getNameFunc) => {
  // Build a Map of adminAddress => one transaction (to handle multiple approvals from same admin)
  const approvalMap = new Map()
  for (const tx of approvalTxs) {
    const adminAddr = tx.creatorAddress
    if (!approvalMap.has(adminAddr)) {
      approvalMap.set(adminAddr, tx)
    }
  }
  // Turn the map into an array for iteration
  const approvalArray = Array.from(approvalMap, ([adminAddr, tx]) => ({ adminAddr, tx }))
  // Build table rows asynchronously, since we need getNameFromAddress
  const tableRows = await Promise.all(
    approvalArray.map(async ({ adminAddr, tx }) => {
      let adminName
      try {
        adminName = await getNameFunc(adminAddr)
      } catch (err) {
        console.warn(`Error fetching name for ${adminAddr}:`, err)
        adminName = null
      }
      const displayName =
        adminName && adminName !== adminAddr
          ? adminName
          : "(No registered name)"

      const dateStr = new Date(tx.timestamp).toLocaleString()
      return `
        <tr>
          <td style="border: 1px solid rgb(255, 255, 255); padding: 4px; color: #234565">${displayName}</td>
          <td style="border: 1px solid rgb(255, 254, 254); padding: 4px;">${dateStr}</td>
        </tr>
      `
    })
  )
  // The total unique approvals = number of entries in approvalMap
  const uniqueApprovalCount = approvalMap.size;
  // Wrap the table in a container with horizontal scroll:
  //    1) max-width: 100% makes it fit the parent (card) width
  //    2) overflow-x: auto allows scrolling if the table is too wide
  const containerHtml = `
    <div style="max-width: 100%; overflow-x: auto;">
      <table style="border: 1px solid #ccc; border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background:rgba(6, 50, 59, 0.61);">
            <th style="border: 1px solid #ffffff; padding: 4px;">Admin Name</th>
            <th style="border: 1px solid #ffffff; padding: 4px;">Approval Time</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows.join("")}
        </tbody>
      </table>
    </div>
  `
  // Return both the container-wrapped table and the count of unique approvals
  return {
    tableHtml: containerHtml,
    uniqueApprovalCount
  }
}


const handleGroupApproval = async (pendingSignature) => {
  try{
    if (!userState.isMinterAdmin) {
      console.warn(`non-admin attempting to sign approval!`)
      return
    }
    const fee = 0.01
    const adminPublicKey = await getPublicKeyByName(userState.accountName)
    const txGroupId = 0
    const rawGroupApprovalTransaction = await createGroupApprovalTransaction(adminPublicKey, pendingSignature, txGroupId, fee)
    const signedGroupApprovalTransaction = await qortalRequest({
      action: "SIGN_TRANSACTION",
      unsignedBytes: rawGroupApprovalTransaction
    })

    let txToProcess = signedGroupApprovalTransaction
    const processGroupApprovalTx = await processTransaction(txToProcess)

    if (processGroupApprovalTx) {
      alert(`transaction processed, please wait for CONFIRMATION: ${JSON.stringify(processGroupApprovalTx)}`)
    } else {
      alert(`creating tx failed for some reason`)
    }
    
  }catch(error){
    console.error(error)
    throw error
  }
}

const handleJoinGroup = async (minterAddress) => {
  try{
    if (userState.accountAddress === minterAddress) {
      console.log(`minter user found `)

      const qRequestAttempt = await qortalRequest({
        action: "JOIN_GROUP",
        groupId: 694
      })

      if (qRequestAttempt) {
        return true
      }

      const joinerPublicKey = getPublicKeyFromAddress(minterAddress)
      const fee = 0.01
      const joinGroupTransactionData = await createGroupJoinTransaction(minterAddress, joinerPublicKey, 694, 0, fee)
      const signedJoinGroupTransaction = await qortalRequest({
        action: "SIGN_TRANSACTION",
        unsignedBytes: joinGroupTransactionData
      })
      let txToProcess = signedJoinGroupTransaction
      const processJoinGroupTransaction = await processTransaction(txToProcess)

      if (processJoinGroupTransaction){
        console.warn(`processed JOIN_GROUP tx`,processJoinGroupTransaction)
        alert(`JOIN GROUP Transaction Processed Successfully, please WAIT FOR CONFIRMATION txData: ${JSON.stringify(processJoinGroupTransaction)}`)
      }
      
    } else {
      console.warn(`user is not the minter`)
      return ''
    }
  } catch(error){
    throw error
  }
}

const getMinterAvatar = async (minterName) => {
  const avatarUrl = `/arbitrary/THUMBNAIL/${minterName}/qortal_avatar`
  try {
    const response = await fetch(avatarUrl, { method: 'HEAD' })

    if (response.ok) {
      return `<img src="${avatarUrl}" alt="User Avatar" class="user-avatar" style="width: 50px; height: 50px; border-radius: 50%; align-self: center;">`
    } else {
      return ''
    }

  } catch (error) {
    console.error('Error checking avatar availability:', error)
    return ''
  }
}

const getNewestCommentTimestamp = async (cardIdentifier) => {
  try {
    // fetchCommentsForCard returns resources each with at least 'created' or 'updated'
    const comments = await fetchCommentsForCard(cardIdentifier)
    if (!comments || comments.length === 0) {
	      // No comments => fallback to 0 (or card's own date, if you like)
      return 0
    }
    // The newest can be determined by comparing 'updated' or 'created'
    const newestTimestamp = comments.reduce((acc, c) => {
      const cTime = c.updated || c.created || 0
      return (cTime > acc) ? cTime : acc
    }, 0)
    return newestTimestamp
  } catch (err) {
    console.error('Failed to get newest comment timestamp:', err)
    return 0
  }
}

// Create the overall Minter Card HTML -----------------------------------------------
const createCardHTML = async (cardData, pollResults, cardIdentifier, commentCount, cardUpdatedTime, bgColor, address, isExistingMinter=false) => {
  const { header, content, links, creator, creatorAddress, timestamp, poll } = cardData
  const formattedDate = cardUpdatedTime ? new Date(cardUpdatedTime).toLocaleString() : new Date(timestamp).toLocaleString()
  const avatarHtml = await getMinterAvatar(creator)
  const linksHTML = links.map((link, index) => `
    <button onclick="openLinksModal('${link}')">
      ${`Link ${index + 1} - ${link}`}
    </button>
  `).join("")

  const minterGroupMembers = await fetchMinterGroupMembers()
  const minterAdmins = await fetchMinterGroupAdmins()
  const { adminYes = 0, adminNo = 0, minterYes = 0, minterNo = 0, totalYes = 0, totalNo = 0, totalYesWeight = 0, totalNoWeight = 0, detailsHtml, userVote } = await processPollData(pollResults, minterGroupMembers, minterAdmins, creator, cardIdentifier)
  createModal('links')
  createModal('poll-details')

  const inviteButtonHtml = isExistingMinter ? "" : await checkAndDisplayInviteButton(adminYes, creator, cardIdentifier)
  let inviteHtmlAdd = (inviteButtonHtml) ? inviteButtonHtml : ''

  let finalBgColor = bgColor
  let invitedText = "" // for "INVITED" label if found
  const addressInfo = await getAddressInfo(address)
  const penaltyText = addressInfo.blocksMintedPenalty == 0 ? '' : '<p>(has Blocks Penalty)<p>'
  const adjustmentText = addressInfo.blocksMintedAdjustment == 0 ? '' : '<p>(has Blocks Adjustment)<p>'

  try {
    const invites = await fetchGroupInvitesByAddress(address)
    const hasMinterInvite = invites.some((invite) => invite.groupId === 694)
    if (userVote === 0) {
      finalBgColor = "rgba(1, 65, 39, 0.41)"; // or any green you want
    } else if (userVote === 1) {
      finalBgColor = "rgba(107, 3, 3, 0.3)"; // or any red you want
    } else if (isExistingMinter){
      finalBgColor = "rgb(99, 99, 99)"
      invitedText = `<h4 style="color:rgb(135, 55, 16); margin-bottom: 0.5em;">EXISTING MINTER</h4>`
    } else if (hasMinterInvite) {
      // If so, override background color & add an "INVITED" label
      finalBgColor = "black"; 
      invitedText = `<h4 style="color: gold; margin-bottom: 0.5em;">INVITED</h4>`
      if (userState.accountName === creator){ //Check also if the creator is the user, and display the join group button if so.
        inviteHtmlAdd = `
          <div id="join-button-container-${cardIdentifier}" style="margin-top: 1em;">
            <button 
                style="padding: 8px; background: rgb(37, 99, 44); color:rgb(240, 240, 240); border: 1px solid rgb(255, 255, 255); border-radius: 5px; cursor: pointer;"
                onmouseover="this.style.backgroundColor='rgb(25, 47, 39) '"
                onmouseout="this.style.backgroundColor='rgb(37, 99, 44) '"
                onclick="handleJoinGroup('${userState.accountAddress}')">
              Join MINTER Group
            </button>
          </div>
          `
      }else{
        console.log(`user is not the minter... NOT displaying any join button`)
        inviteHtmlAdd = ''
      }
    }
       //do not display invite button as they're already invited. Create a join button instead.
  } catch (error) {
    console.error("Error checking invites for user:", error)
  }

  return `
  <div class="minter-card" style="background-color: ${finalBgColor}">
    <div class="minter-card-header">
      ${avatarHtml}
      <h3>${creator} - Level ${addressInfo.level}</h3>
      <p>${header}</p>
      ${penaltyText}${adjustmentText}${invitedText}
    </div>
    <div class="support-header"><h5>USER'S POST</h5></div>
    <div class="info">
      ${content}
    </div>
    <div class="support-header"><h5>USER'S LINKS</h5></div>
    <div class="info-links">
      ${linksHTML}
    </div>
    <div class="results-header support-header"><h5>CURRENT SUPPORT RESULTS</h5></div>
    <div class="minter-card-results">
      <button onclick="togglePollDetails('${cardIdentifier}')">Display Poll Details</button>
      <div id="poll-details-${cardIdentifier}" style="display: none;">
        ${detailsHtml}
      </div>
      ${inviteHtmlAdd}
      <div class="admin-results">
        <span class="admin-yes">Admin Yes: ${adminYes}</span>
        <span class="admin-no">Admin No: ${adminNo}</span>
      </div>
      <div class="minter-results">
        <span class="minter-yes">Minter Yes: ${minterYes}</span>
        <span class="minter-no">Minter No: ${minterNo}</span>
      </div>
      <div class="total-results">
        <span class="total-yes">Total Yes: ${totalYes}</span>
        <span class="total-yes">Weight: ${totalYesWeight}</span>
        <span class="total-no">Total No: ${totalNo}</span>
        <span class="total-no">Weight: ${totalNoWeight}</span>
      </div>
    </div>
    <div class="support-header"><h5>SUPPORT ACTION FOR </h5><h5 style="color: #ffae42;">${creator}</h5>
    <p style="color: #c7c7c7; font-size: .65rem; margin-top: 1vh">(click COMMENTS button to open/close card comments)</p>
    </div>
    <div class="actions">
      <div class="actions-buttons">
        <button class="yes" onclick="voteYesOnPoll('${poll}')">YES</button>
        <button class="comment" id="comment-button-${cardIdentifier}" data-comment-count="${commentCount}"  onclick="toggleComments('${cardIdentifier}')">COMMENTS (${commentCount})</button>
        <button class="no" onclick="voteNoOnPoll('${poll}')">NO</button>
      </div>
    </div>
    <div id="comments-section-${cardIdentifier}" class="comments-section" style="display: none; margin-top: 20px;">
      <div id="comments-container-${cardIdentifier}" class="comments-container"></div>
      <textarea id="new-comment-${cardIdentifier}" placeholder="Write a comment..." style="width: 100%; margin-top: 10px;"></textarea>
      <button onclick="postComment('${cardIdentifier}')">Post Comment</button>
    </div>
    <p style="font-size: 0.75rem; margin-top: 3vh; color: #4496a1">By: ${creator} - ${formattedDate}</p>
  </div>
  `
}


export class PlayerDialog extends Dialog {
    constructor(callback, options) {
      if (typeof (options) !== "object") {
        options = {};
      }
      let applyChanges = false;
      super({
        title: "Donner objet",
        content: `
        <form>
          <div class="form-group">
            <label>Quantité:</label>
            <input type=number min="1" id="quantity" name="quantity" value="1">
            <label>Personnage:</label>
            <select name="type" id="player">
              ${options.filteredPCList.reduce((acc, currentActor) => {
                return acc + `<option value="${currentActor.id}">${currentActor.name}</option>`
              }, '')}
            </select>
          </div>
        </form>`,
        buttons: {
          yes: {
            icon: "<i class='fas fa-check'></i>",
            label: options.acceptLabel ? options.acceptLabel : "Accepter",
            callback: () => applyChanges = true
          },
          no: {
            icon: "<i class='fas fa-times'></i>",
            label: "Annuler"
          },
        },
        default: "yes",
        close: () => {
          if (applyChanges) {
            const playerId = document.getElementById('player').value;
            let quantity = document.getElementById('quantity').value;
            if (isNaN(quantity)) {
              console.log("Item quantity invalid");
              return ui.notifications.error(`Item quantity invalid.`);
            }
            quantity = Number(quantity);
            callback({playerId, quantity});
          }
        }
      });
    }
}

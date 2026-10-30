const {test,expect}=require('@playwright/test');

test.use({viewport:{width:390,height:844}});
async function onboard(page){
 await page.goto('http://127.0.0.1:8765/');
 const welcome=page.locator('#welcomeForm');
 if(await welcome.count()){
   await page.locator('#welcomeName').fill('Pessoa Teste');
   await page.locator('input[name="welcomePlan"][value="abc"]').check({force:true});
   await page.locator('button.welcome-start').click();
 }
 await expect(page.locator('#pageContent .hero')).toBeVisible();
}
test('onboarding, filtros, foco do modal e tela mobile',async({page})=>{
 await onboard(page);
 await page.locator('.mobile-nav [data-page="biblioteca"]').click();
 await page.locator('#searchExercises').fill('supino');
 await expect(page.locator('#libraryCount')).toContainText('exercícios');
 const trigger=page.locator('#libraryCards [data-action="exercise"]').first();
 await trigger.click();
 await expect(page.getByRole('dialog')).toBeVisible();
 await expect(page.locator('#modalTitle')).toContainText('Supino');
 await page.keyboard.press('Escape');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await expect(trigger).toBeFocused();
 await page.locator('.mobile-nav [data-page="progresso"]').click();
 await page.locator('.period-option[data-days="7"]').click();
 await expect(page.locator('.period-option[data-days="7"]')).toHaveAttribute('aria-pressed','true');
 await page.locator('.period-option[data-days="90"]').click();
 await expect(page.locator('.period-option[data-days="90"]')).toHaveAttribute('aria-pressed','true');
});
test('retoma treino parcial e não troca dia sem confirmação',async({page})=>{
 await onboard(page);
 await page.locator('[data-action="start-workout"]').click();
 await expect(page.locator('.modal [data-action="jump-to-sets"]')).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(page.locator('[data-action="start-workout"]')).toContainText('Retomar treino salvo');
 page.once('dialog',dialog=>dialog.dismiss());
 await page.locator('.day-card[data-index="1"]').click();
 await expect(page.locator('.day-card[data-index="0"]')).toHaveClass(/active/);
 await page.reload();
 await expect(page.locator('[data-action="start-workout"]')).toContainText('Retomar treino salvo');
});
test('backup preserva chave de dados anterior',async({page})=>{
 await onboard(page);
 await page.locator('.mobile-nav [data-page="progresso"]').click();
 const downloadPromise=page.waitForEvent('download');
 await page.locator('[data-action="export"]').click();
 const download=await downloadPromise;
 expect(download.suggestedFilename()).toBe('treinapro-backup.json');
 const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('treinapro-personal-v1')));
 expect(stored.name).toBe('Pessoa Teste');
 expect(Array.isArray(stored.history)).toBeTruthy();
});

test('recupera perfil do IndexedDB quando localStorage foi limpo',async({page})=>{
 await onboard(page);
 await page.waitForFunction(async()=>{
   const saved=await window.TreinaProStore.load();
   return saved?.state?.name==='Pessoa Teste';
 });
 await page.evaluate(()=>localStorage.removeItem('treinapro-personal-v1'));
 await page.reload();
 await expect(page.locator('#welcomeForm')).toHaveCount(0);
 await expect(page.locator('#app')).not.toHaveAttribute('inert','');
 await page.locator('.mobile-nav [data-page="treinos"]').click();
 await expect(page.getByRole('heading',{name:/Meus treinos/})).toBeVisible();
});

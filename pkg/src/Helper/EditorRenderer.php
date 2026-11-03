<?php
/**
 * @copyright  (C) 2026 COLORPACK CREATION CO., LTD.
 * @license    GNU General Public License version 2 or later
 */

namespace Colorpack\Plugin\Editors\Editorjs\Helper;

\defined('_JEXEC') or die;

use Joomla\CMS\Component\ComponentHelper;
use Joomla\CMS\Plugin\PluginHelper;
use Joomla\CMS\Session\Session;
use Joomla\CMS\Uri\Uri;

final class EditorRenderer
{
	/**
	 * @param   string  $name     Control name, already escaped by the caller (Joomla contract).
	 * @param   string  $content  Field value, already HTML-escaped by the caller (Joomla contract).
	 */
	public static function render($app, $params, string $name, string $content, string $id, $height, bool $readonly, string $buttons): string
	{
		$wa = $app->getDocument()->getWebAssetManager();
		$wa->useScript('core');

		// The "editors" asset (Joomla 5+) carries the import map for the editor API; Joomla 4 has neither.
		$deps = $wa->assetExists('script', 'editors') ? ['core', 'editors'] : ['core'];

		if (!$wa->assetExists('script', 'plg_editors_editorjs.editor'))
		{
			$wa->registerScript('plg_editors_editorjs.editor', 'plg_editors_editorjs/editorjs.min.js', ['version' => 'auto'], ['type' => 'module'], $deps);
			$wa->registerStyle('plg_editors_editorjs.editor', 'plg_editors_editorjs/editorjs.css', ['version' => 'auto']);
		}

		$wa->useScript('plg_editors_editorjs.editor')->useStyle('plg_editors_editorjs.editor');

		$user   = $app->getIdentity();
		$config = [
			'lang'       => $app->getLanguage()->getTag(),
			'rtl'        => (bool) $app->getLanguage()->isRtl(),
			'readonly'   => $readonly,
			'rootUrl'    => rtrim(Uri::root(), '/') . '/',
			'canUpload'  => $user && $user->authorise('core.create', 'com_media'),
			'canBrowse'  => $user && ($user->authorise('core.manage', 'com_media') || $user->authorise('core.create', 'com_media')),
			'token'      => Session::getFormToken(),
			'uploadUrl'  => Uri::base(true) . '/index.php?option=com_ajax&plugin=editorjs&group=editors&format=raw',
			'mediaUrl'   => Uri::base(true) . '/index.php?option=com_media&view=media&tmpl=component',
			'mediaApi'   => Uri::base(true) . '/index.php?option=com_media&format=json&task=api.files&url=1&mediatypes=0,1,2,3',
			'maxWidth'   => (int) $params->get('max_width', 1920),
			'iframeFiltered' => stripos(ComponentHelper::filterText('<iframe src="https://example.com/"></iframe>'), '<iframe') === false,
			'embedPlugin'    => PluginHelper::isEnabled('content', 'colorpackembed'),
			'tableClass' => trim((string) $params->get('table_class', 'uk-table uk-table-divider table')),
		];

		$minHeight = is_numeric($height) ? $height . 'px' : (preg_match('/^\d+(\.\d+)?(px|rem|em|vh)$/', (string) $height) ? $height : '400px');
		$attr      = htmlspecialchars(json_encode($config, JSON_UNESCAPED_SLASHES), ENT_QUOTES, 'UTF-8');

		return '<joomla-editor-editorjs data-config="' . $attr . '" style="--editorjs-min-height:' . $minHeight . '">'
			. '<textarea name="' . $name . '" id="' . $id . '" rows="20"' . ($readonly ? ' readonly disabled' : '') . ' hidden>' . $content . '</textarea>'
			. $buttons
			. '</joomla-editor-editorjs>';
	}
}
